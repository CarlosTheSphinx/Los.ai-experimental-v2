import type { Express, Request, Response } from 'express';
import { eq, and, isNull, isNotNull, lt } from 'drizzle-orm';
import { users } from '@shared/schema';
import { getStripeClient } from '../lib/stripe';
import { getResendClient } from '../email';

interface AuthRequest extends Request {
  user?: any;
}

// Price ID lookup for Stripe Checkout — populated from env vars set after ORC-47 approval + ORC-85 product creation.
// Env var naming: STRIPE_PRICE_ID_{TIER}_{PERIOD}[_FOUNDING]
// e.g. STRIPE_PRICE_ID_STARTER_MONTHLY, STRIPE_PRICE_ID_PRO_ANNUAL_FOUNDING
const TIER_PERIOD_ENV: Record<string, string> = {
  'starter_monthly':          'STRIPE_PRICE_ID_STARTER_MONTHLY',
  'starter_annual':           'STRIPE_PRICE_ID_STARTER_ANNUAL',
  'pro_monthly':              'STRIPE_PRICE_ID_PRO_MONTHLY',
  'pro_annual':               'STRIPE_PRICE_ID_PRO_ANNUAL',
  'team_monthly':             'STRIPE_PRICE_ID_TEAM_MONTHLY',
  'team_annual':              'STRIPE_PRICE_ID_TEAM_ANNUAL',
  'starter_monthly_founding': 'STRIPE_PRICE_ID_STARTER_MONTHLY_FOUNDING',
  'starter_annual_founding':  'STRIPE_PRICE_ID_STARTER_ANNUAL_FOUNDING',
  'pro_monthly_founding':     'STRIPE_PRICE_ID_PRO_MONTHLY_FOUNDING',
  'pro_annual_founding':      'STRIPE_PRICE_ID_PRO_ANNUAL_FOUNDING',
  'team_monthly_founding':    'STRIPE_PRICE_ID_TEAM_MONTHLY_FOUNDING',
  'team_annual_founding':     'STRIPE_PRICE_ID_TEAM_ANNUAL_FOUNDING',
};

export function lookupCheckoutPriceId(tier: string, period: string, foundingBroker: boolean): string | null {
  const suffix = foundingBroker ? '_founding' : '';
  const key = `${tier}_${period}${suffix}`;
  const envVar = TIER_PERIOD_ENV[key];
  if (!envVar) return null;
  return process.env[envVar] ?? null;
}

export function registerBillingRoutes(
  app: Express,
  deps: { db: any; authenticateUser: any }
) {
  const { db, authenticateUser } = deps;

  // Stripe webhook — must use raw body for signature verification
  // IMPORTANT: register before express.json() parses the body; server/index.ts captures rawBody via verify callback
  app.post('/api/billing/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[billing/webhook] STRIPE_WEBHOOK_SECRET is not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      const stripe = getStripeClient();
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).json({ error: 'Missing raw body' });
      }
      event = stripe.webhooks.constructEvent(rawBody as Buffer, sig, webhookSecret);
    } catch (err: any) {
      console.error('[billing/webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      await handleStripeEvent(event, db);
      res.json({ received: true });
    } catch (err: any) {
      console.error('[billing/webhook] Handler error for event', event.type, err);
      res.status(500).json({ error: 'Handler failed' });
    }
  });

  // GET /api/billing/subscription — returns current subscription state for the authenticated user
  app.get('/api/billing/subscription', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const [user] = await db.select({
        subscriptionStatus: users.subscriptionStatus,
        subscriptionTier: users.subscriptionTier,
        billingPeriod: users.billingPeriod,
        foundingBroker: users.foundingBroker,
        foundingDiscountRate: users.foundingDiscountRate,
        trialEndsAt: users.trialEndsAt,
        convertedAt: users.convertedAt,
        pilotActivatedAt: users.pilotActivatedAt,
      }).from(users).where(eq(users.id, userId));

      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      console.error('[billing/subscription] error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/billing/portal — create a Stripe Customer Portal session for billing management
  app.post('/api/billing/portal', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const [user] = await db.select({
        stripeCustomerId: users.stripeCustomerId,
      }).from(users).where(eq(users.id, userId));

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No billing account found. Please subscribe first.' });
      }

      const stripe = getStripeClient();
      const returnUrl = `${process.env.APP_URL || ''}/settings?tab=billing`;
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error('[billing/portal] error:', err);
      res.status(500).json({ error: 'Failed to create billing portal session' });
    }
  });

  // POST /api/billing/checkout — create a Stripe Checkout session for new subscriptions
  // Requires: STRIPE_PRICE_ID_* env vars to be set (configured after ORC-47 approval + ORC-85 product creation)
  app.post('/api/billing/checkout', authenticateUser, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { tier, period } = req.body;

      if (!tier || !period) {
        return res.status(400).json({ error: 'tier and period are required' });
      }

      const validTiers = ['starter', 'pro', 'team'];
      const validPeriods = ['monthly', 'annual'];
      if (!validTiers.includes(tier)) return res.status(400).json({ error: 'Invalid tier' });
      if (!validPeriods.includes(period)) return res.status(400).json({ error: 'Invalid period' });

      const [user] = await db.select({
        email: users.email,
        foundingBroker: users.foundingBroker,
        stripeCustomerId: users.stripeCustomerId,
        subscriptionStatus: users.subscriptionStatus,
      }).from(users).where(eq(users.id, userId));

      if (!user) return res.status(404).json({ error: 'User not found' });

      // Block if already actively subscribed
      if (user.subscriptionStatus === 'active') {
        return res.status(400).json({ error: 'Already subscribed. Use the billing portal to manage your plan.' });
      }

      const priceId = lookupCheckoutPriceId(tier, period, user.foundingBroker ?? false);
      if (!priceId) {
        console.warn(`[billing/checkout] Price ID not configured for tier=${tier} period=${period} founding=${user.foundingBroker}`);
        return res.status(503).json({
          error: 'Billing is not yet fully configured. Subscription pricing will be available shortly.',
          code: 'PRICE_NOT_CONFIGURED',
        });
      }

      const stripe = getStripeClient();
      const appUrl = process.env.APP_URL || '';

      const sessionParams: any = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings?tab=billing&checkout=success`,
        cancel_url: `${appUrl}/settings?tab=billing&checkout=cancel`,
        client_reference_id: String(userId),
        metadata: { userId: String(userId), tier, period },
      };

      // Attach existing Stripe customer or pre-fill email for new customers
      if (user.stripeCustomerId) {
        sessionParams.customer = user.stripeCustomerId;
      } else {
        sessionParams.customer_email = user.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (err: any) {
      console.error('[billing/checkout] error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // POST /api/cron/referral-qualify — run daily referral qualification check
  // Called daily by external cron; authenticated via x-cron-key header
  app.post('/api/cron/referral-qualify', async (req: Request, res: Response) => {
    const cronKey = req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET_KEY;
    if (!expectedKey) {
      console.error('[cron/referral-qualify] CRON_SECRET_KEY not set');
      return res.status(503).json({ error: 'Cron endpoint not configured' });
    }
    if (cronKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { runReferralQualificationCron } = await import('../services/referral');
      await runReferralQualificationCron();
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[cron/referral-qualify] error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/cron/pilot-conversion — send Day-75 conversion emails to eligible pilot brokers
  // Called daily by external cron; authenticated via x-cron-key header
  app.post('/api/cron/pilot-conversion', async (req: Request, res: Response) => {
    const cronKey = req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET_KEY;
    if (!expectedKey) {
      console.error('[cron/pilot-conversion] CRON_SECRET_KEY not set');
      return res.status(503).json({ error: 'Cron endpoint not configured' });
    }
    if (cronKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const sent: number[] = [];
      const skipped: number[] = [];

      // Find pilot brokers who hit Day 75 but haven't received the conversion email yet
      const DAY75_MS = 75 * 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - DAY75_MS);

      const candidates = await db.select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        foundingBroker: users.foundingBroker,
        subscriptionStatus: users.subscriptionStatus,
        pilotActivatedAt: users.pilotActivatedAt,
      })
        .from(users)
        .where(
          and(
            eq(users.isPilotBroker, true),
            isNotNull(users.pilotActivatedAt),
            lt(users.pilotActivatedAt, cutoff),
            isNull(users.day75EmailSentAt)
          )
        );

      for (const candidate of candidates) {
        // Skip users who already converted
        if (candidate.subscriptionStatus === 'active') {
          await db.update(users).set({ day75EmailSentAt: new Date() }).where(eq(users.id, candidate.id));
          skipped.push(candidate.id);
          continue;
        }

        try {
          await sendDay75ConversionEmail(candidate);
          await db.update(users).set({ day75EmailSentAt: new Date() }).where(eq(users.id, candidate.id));
          sent.push(candidate.id);
        } catch (emailErr: any) {
          console.error(`[cron/pilot-conversion] Email failed for user ${candidate.id}:`, emailErr.message);
        }
      }

      console.log(`[cron/pilot-conversion] sent=${sent.length} skipped=${skipped.length}`);
      res.json({ sent: sent.length, skipped: skipped.length });
    } catch (err: any) {
      console.error('[cron/pilot-conversion] error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

async function sendDay75ConversionEmail(user: {
  email: string;
  fullName?: string | null;
  foundingBroker: boolean;
}) {
  const { client, fromEmail } = await getResendClient();
  const appUrl = process.env.APP_URL || '';
  const billingUrl = `${appUrl}/settings?tab=billing`;
  const name = user.fullName?.split(' ')[0] || 'there';

  const foundingCallout = user.foundingBroker
    ? `<div style="background:#fef3c7;border:1px solid #fde68a;padding:12px 16px;border-radius:6px;margin:16px 0;">
        <p style="margin:0 0 8px;"><strong>⭐ Your Founding Broker rates (20% off — locked in permanently):</strong></p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#fde68a;">
            <th style="text-align:left;padding:6px 8px;">Plan</th>
            <th style="text-align:right;padding:6px 8px;">Monthly</th>
            <th style="text-align:right;padding:6px 8px;">Annual <span style="font-weight:normal;">(save 20%)</span></th>
          </tr>
          <tr>
            <td style="padding:6px 8px;">Starter</td>
            <td style="text-align:right;padding:6px 8px;">$79/mo</td>
            <td style="text-align:right;padding:6px 8px;">$63/mo</td>
          </tr>
          <tr style="background:#fffbeb;">
            <td style="padding:6px 8px;">Pro</td>
            <td style="text-align:right;padding:6px 8px;">$159/mo</td>
            <td style="text-align:right;padding:6px 8px;">$127/mo</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;">Team</td>
            <td style="text-align:right;padding:6px 8px;">$319/mo</td>
            <td style="text-align:right;padding:6px 8px;">$255/mo</td>
          </tr>
        </table>
        <p style="margin:8px 0 0;font-size:12px;color:#92400e;">Annual plans billed once per year. Subscribe before Day 104 to lock in your discount permanently.</p>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  h1{color:#1a1a1a;font-size:22px}
  .cta{display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0}
  .footer{margin-top:32px;font-size:12px;color:#888}
  .pricing-table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px;}
  .pricing-table th{background:#f1f5f9;text-align:left;padding:8px 10px;border-bottom:2px solid #e2e8f0;}
  .pricing-table th:not(:first-child){text-align:right;}
  .pricing-table td{padding:8px 10px;border-bottom:1px solid #e2e8f0;}
  .pricing-table td:not(:first-child){text-align:right;}
  .pricing-table tr:nth-child(even){background:#f8fafc;}
  .annual-badge{display:inline-block;background:#dcfce7;color:#166534;font-size:11px;padding:1px 6px;border-radius:10px;margin-left:4px;}
</style></head>
<body>
  <h1>Your Brokr.AI pilot is at Day 75 🎉</h1>
  <p>Hi ${name},</p>
  <p>You've hit <strong>Day 75</strong> of your Brokr.AI pilot — congratulations on making it this far! Your free trial window is coming to a close, and we'd love to keep you on board.</p>
  ${foundingCallout}
  <p>Choose a plan that fits how you work:</p>
  <table class="pricing-table">
    <tr>
      <th>Plan</th>
      <th>Monthly</th>
      <th>Annual <span class="annual-badge">Save 20%</span></th>
    </tr>
    <tr>
      <td><strong>Starter</strong> · Solo brokers</td>
      <td>$99/mo</td>
      <td>$79/mo</td>
    </tr>
    <tr>
      <td><strong>Pro</strong> · Growing teams</td>
      <td>$199/mo</td>
      <td>$159/mo</td>
    </tr>
    <tr>
      <td><strong>Team</strong> · Full organizations</td>
      <td>$399/mo</td>
      <td>$319/mo</td>
    </tr>
  </table>
  <p style="font-size:13px;color:#555;">Annual plans are billed once per year. Save 20% compared to monthly.</p>
  <a href="${billingUrl}" class="cta">Subscribe Now →</a>
  <p>You have until <strong>Day 104</strong> to subscribe before your account enters read-only mode.</p>
  <div class="footer">
    <p>Questions? Reply to this email or visit <a href="${appUrl}">${appUrl.replace('https://', '')}</a></p>
    <p>Brokr.AI · Commercial Lending Made Simple</p>
  </div>
</body>
</html>`;

  await client.emails.send({
    from: fromEmail || 'Brokr.AI <info@brokr.ai>',
    to: user.email,
    subject: user.foundingBroker
      ? '⭐ Day 75: Lock in your Founding Broker discount before it expires'
      : 'Your Brokr.AI pilot is at Day 75 — subscribe to keep access',
    html,
  });
}

async function handleStripeEvent(event: any, db: any) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await syncSubscription(sub, db);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await db.update(users)
        .set({ subscriptionStatus: 'canceled', subscriptionTier: null, stripeSubscriptionId: null })
        .where(eq(users.stripeCustomerId, sub.customer as string));
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await db.update(users)
        .set({ subscriptionStatus: 'past_due' })
        .where(eq(users.stripeCustomerId, invoice.customer as string));
      break;
    }
    // checkout.session.completed — link Stripe customer ID to user account on first checkout
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.client_reference_id && session.customer) {
        const userId = parseInt(session.client_reference_id, 10);
        if (!isNaN(userId)) {
          await db.update(users)
            .set({ stripeCustomerId: session.customer as string })
            .where(and(eq(users.id, userId), isNull(users.stripeCustomerId)));
        }
      }
      break;
    }
    default:
      console.log(`[billing/webhook] Unhandled event: ${event.type}`);
  }
}

export async function syncSubscription(sub: any, db: any) {
  const tier = resolveSubscriptionTier(sub);
  const period = sub.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';

  // Only stamp convertedAt on first activation — plan changes must not overwrite the original date
  const [existing] = await db.select({ convertedAt: users.convertedAt })
    .from(users)
    .where(eq(users.stripeCustomerId, sub.customer as string));

  await db.update(users)
    .set({
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionTier: tier,
      billingPeriod: period,
      ...(sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
      ...(sub.status === 'active' && !existing?.convertedAt ? { convertedAt: new Date() } : {}),
    })
    .where(eq(users.stripeCustomerId, sub.customer as string));
}

export function resolveSubscriptionTier(sub: any): string | null {
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) return null;

  const starterPrices = (process.env.STRIPE_PRICE_IDS_STARTER ?? '').split(',').filter(Boolean);
  const proPrices = (process.env.STRIPE_PRICE_IDS_PRO ?? '').split(',').filter(Boolean);
  const teamPrices = (process.env.STRIPE_PRICE_IDS_TEAM ?? '').split(',').filter(Boolean);

  if (starterPrices.includes(priceId)) return 'starter';
  if (proPrices.includes(priceId)) return 'pro';
  if (teamPrices.includes(priceId)) return 'team';
  console.warn(`[billing] Unrecognized Stripe price ID: ${priceId} — tier set to null`);
  return null;
}
