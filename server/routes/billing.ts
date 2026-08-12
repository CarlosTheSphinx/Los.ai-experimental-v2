import type { Express, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { users } from '@shared/schema';
import { getStripeClient } from '../lib/stripe';

interface AuthRequest extends Request {
  user?: any;
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
      const returnUrl = `${process.env.APP_URL || ''}/settings/billing`;
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
    default:
      // Unhandled event — log and ignore
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
