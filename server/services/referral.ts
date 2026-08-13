import { eq, and, count } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db } from '../db';
import { users, referralCodes, referralEvents } from '@shared/schema';
import { getResendClient } from '../email';

const REFERRAL_CREDIT_CENTS = 2500; // $25 Stripe credit per qualified referral

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateShortCode(): string {
  // Use only alphanumeric chars so codes always pass /^[A-Z0-9]{6,12}$/ validation
  return Array.from(randomBytes(8), b => CHARSET[b % CHARSET.length]).join('');
}

export async function getOrCreateReferralCode(userId: number): Promise<string> {
  const [existing] = await db
    .select({ code: referralCodes.code })
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId));

  if (existing) return existing.code;

  // Generate a unique code
  let code: string;
  let attempts = 0;
  while (true) {
    code = generateShortCode();
    const [collision] = await db
      .select({ id: referralCodes.id })
      .from(referralCodes)
      .where(eq(referralCodes.code, code));
    if (!collision) break;
    if (++attempts > 10) throw new Error('Failed to generate unique referral code');
  }

  await db.insert(referralCodes).values({ userId, code });

  // Persist the code on the user row for easy lookup
  await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));

  return code;
}

export async function captureReferral(referredUserId: number, refCode: string): Promise<void> {
  const [codeRow] = await db
    .select({ userId: referralCodes.userId })
    .from(referralCodes)
    .where(eq(referralCodes.code, refCode));

  if (!codeRow) return; // Unknown code — silently ignore
  if (codeRow.userId === referredUserId) return; // Self-referral — skip

  await db.insert(referralEvents).values({
    referrerUserId: codeRow.userId,
    referredUserId,
    status: 'pending',
  }).onConflictDoNothing(); // referred_user_id is unique — idempotent
}

export async function getReferralStats(userId: string | number): Promise<{
  referralLink: string;
  code: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
}> {
  const uid = Number(userId);
  const code = await getOrCreateReferralCode(uid);
  const baseUrl = process.env.BASE_URL || 'https://brokr.ai';
  const referralLink = `${baseUrl}/ref/${code}`;

  const all = await db
    .select({ status: referralEvents.status })
    .from(referralEvents)
    .where(eq(referralEvents.referrerUserId, uid));

  const totalReferrals = all.length;
  const qualifiedReferrals = all.filter(r => r.status === 'qualified' || r.status === 'credited').length;
  const pendingReferrals = all.filter(r => r.status === 'pending').length;

  return { referralLink, code, totalReferrals, qualifiedReferrals, pendingReferrals };
}

// Daily qualification cron: mark referral_events as qualified when referred user has been
// a paying subscriber for 30+ days. Issues Stripe credit and sends email notification.
export async function runReferralQualificationCron(): Promise<void> {
  const pending = await db
    .select()
    .from(referralEvents)
    .where(eq(referralEvents.status, 'pending'));

  for (const event of pending) {
    try {
      const [referred] = await db
        .select({
          subscriptionStatus: users.subscriptionStatus,
          convertedAt: users.convertedAt,
          stripeCustomerId: users.stripeCustomerId,
        })
        .from(users)
        .where(eq(users.id, event.referredUserId));

      if (!referred) {
        // Referred user deleted — cascade handles DB cleanup; skip
        continue;
      }

      // Cancelled accounts can never qualify — mark permanently disqualified
      if (referred.subscriptionStatus === 'canceled') {
        await db
          .update(referralEvents)
          .set({ status: 'disqualified' })
          .where(eq(referralEvents.id, event.id));
        continue;
      }

      const isActive = referred.subscriptionStatus === 'active';
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const hasBeenPayingThirtyDays =
        referred.convertedAt && referred.convertedAt < thirtyDaysAgo;

      if (!isActive || !hasBeenPayingThirtyDays) continue;

      // Mark qualified
      await db
        .update(referralEvents)
        .set({ status: 'qualified', qualifiedAt: new Date() })
        .where(eq(referralEvents.id, event.id));

      // Issue Stripe credit if Stripe is configured
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const [referrer] = await db
        .select({ stripeCustomerId: users.stripeCustomerId, email: users.email, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, event.referrerUserId));

      if (stripeKey && referrer?.stripeCustomerId) {
        try {
          const { default: Stripe } = await import('stripe');
          const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });
          await stripe.customers.createBalanceTransaction(referrer.stripeCustomerId, {
            amount: -REFERRAL_CREDIT_CENTS,
            currency: 'usd',
            description: 'Broker referral credit',
          });

          await db
            .update(referralEvents)
            .set({ status: 'credited', creditAmount: REFERRAL_CREDIT_CENTS, creditedAt: new Date() })
            .where(eq(referralEvents.id, event.id));

          // Send email notification
          if (referrer.email) {
            sendReferralCreditEmail(referrer.email, referrer.fullName ?? 'there', REFERRAL_CREDIT_CENTS).catch(
              err => console.error('[referral] Failed to send credit email:', err)
            );
          }
        } catch (err) {
          console.error('[referral] Stripe credit failed for event', event.id, err);
        }
      }
    } catch (err) {
      console.error('[referral] Qualification cron error for event', event.id, err);
    }
  }
}

async function sendReferralCreditEmail(
  toEmail: string,
  name: string,
  creditCents: number
): Promise<void> {
  const { client, fromEmail } = await getResendClient();
  const creditDollars = (creditCents / 100).toFixed(0);
  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `You earned a $${creditDollars} Brokr.AI referral credit!`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Referral Credit Confirmed</h2>
        <p>Hey ${name},</p>
        <p>Great news — one of your referrals just became a paying Brokr.AI subscriber for 30+ days.
           We've applied a <strong>$${creditDollars} credit</strong> to your account. It will appear on your next invoice.</p>
        <p>Keep sharing your referral link to earn more credits.</p>
        <p style="color: #64748b; font-size: 12px;">The Brokr.AI Team</p>
      </body>
      </html>
    `,
  });
}
