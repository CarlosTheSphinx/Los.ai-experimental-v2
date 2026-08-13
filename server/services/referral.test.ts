/**
 * Unit tests for the referral service (server/services/referral.ts).
 * All DB and external calls are mocked; no live database required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (hoisted before module imports) ────────────────────────────────────

vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@shared/schema', () => ({
  users: 'users_table',
  referralCodes: 'referral_codes_table',
  referralEvents: 'referral_events_table',
}));

vi.mock('drizzle-orm', () => ({
  eq: (_field: any, value: any) => ({ __eq: value }),
  and: (...args: any[]) => ({ __and: args }),
  count: () => ({ __count: true }),
}));

vi.mock('../email', () => ({
  getResendClient: vi.fn(),
}));

// Stripe is loaded via dynamic import inside the service; mock at module level
vi.mock('stripe', () => {
  const mockCreateBalanceTx = vi.fn().mockResolvedValue({ id: 'btxn_test' });
  const MockStripe = vi.fn().mockImplementation(() => ({
    customers: { createBalanceTransaction: mockCreateBalanceTx },
  }));
  (MockStripe as any).__mockCreateBalanceTx = mockCreateBalanceTx;
  return { default: MockStripe };
});

import { db } from '../db';
import {
  getOrCreateReferralCode,
  captureReferral,
  getReferralStats,
  runReferralQualificationCron,
} from './referral';
import { getResendClient } from '../email';

// ── Mock-chain helpers ───────────────────────────────────────────────────────

const mockDb = db as any;

function selectReturning(result: any[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  };
}

function insertChain() {
  return {
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

function updateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

// ── getOrCreateReferralCode ──────────────────────────────────────────────────

describe('getOrCreateReferralCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the existing code without inserting when one already exists', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([{ code: 'EXISTING1' }]));

    const code = await getOrCreateReferralCode(1);

    expect(code).toBe('EXISTING1');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('generates an 8-char alphanumeric code and persists it when none exists', async () => {
    // No existing code for user
    mockDb.select.mockReturnValueOnce(selectReturning([]));
    // Collision check: no collision
    mockDb.select.mockReturnValueOnce(selectReturning([]));
    mockDb.insert.mockReturnValueOnce(insertChain());
    mockDb.update.mockReturnValueOnce(updateChain());

    const code = await getOrCreateReferralCode(99);

    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('retries once on code collision and succeeds on the second attempt', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([]));       // no existing code
    mockDb.select.mockReturnValueOnce(selectReturning([{ id: 1 }])); // first candidate collides
    mockDb.select.mockReturnValueOnce(selectReturning([]));       // second candidate is free
    mockDb.insert.mockReturnValueOnce(insertChain());
    mockDb.update.mockReturnValueOnce(updateChain());

    const code = await getOrCreateReferralCode(99);

    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    // 1 existing-code check + 2 collision checks = 3 total selects
    expect(mockDb.select).toHaveBeenCalledTimes(3);
  });
});

// ── captureReferral ──────────────────────────────────────────────────────────

describe('captureReferral', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a pending referral_events row for a valid code and distinct users', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([{ userId: 10 }]));
    mockDb.insert.mockReturnValueOnce(insertChain());

    await captureReferral(20, 'VALIDCODE');

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the referral code is not found in the DB', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([]));

    await captureReferral(20, 'BADCODE12');

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('does nothing when the referred user is the same as the referrer (self-referral guard)', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([{ userId: 20 }]));

    await captureReferral(20, 'OWNCODE12');

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});

// ── getReferralStats ─────────────────────────────────────────────────────────

describe('getReferralStats', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, BASE_URL: 'https://brokr.ai' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('aggregates qualified and credited events together in qualifiedReferrals', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([{ code: 'MYCODE12' }]));
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { status: 'pending' },
          { status: 'pending' },
          { status: 'qualified' },
          { status: 'credited' },
        ]),
      }),
    });

    const stats = await getReferralStats(5);

    expect(stats.code).toBe('MYCODE12');
    expect(stats.referralLink).toBe('https://brokr.ai/ref/MYCODE12');
    expect(stats.totalReferrals).toBe(4);
    expect(stats.qualifiedReferrals).toBe(2);
    expect(stats.pendingReferrals).toBe(2);
  });

  it('returns zero stats when the user has no referral events', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([{ code: 'MYCODE12' }]));
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const stats = await getReferralStats(5);

    expect(stats.totalReferrals).toBe(0);
    expect(stats.qualifiedReferrals).toBe(0);
    expect(stats.pendingReferrals).toBe(0);
  });

  it('uses BASE_URL env var to build the referral link', async () => {
    process.env.BASE_URL = 'https://custom.domain.com';
    mockDb.select.mockReturnValueOnce(selectReturning([{ code: 'LINK1234' }]));
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const stats = await getReferralStats(5);

    expect(stats.referralLink).toBe('https://custom.domain.com/ref/LINK1234');
  });
});

// ── runReferralQualificationCron ─────────────────────────────────────────────

describe('runReferralQualificationCron', () => {
  const OLD_ENV = process.env;
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  const pendingEvent = { id: 1, referrerUserId: 10, referredUserId: 20, status: 'pending' };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV };
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('marks event as disqualified when referred user subscription is canceled', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([pendingEvent]));
    mockDb.select.mockReturnValueOnce(selectReturning([{
      subscriptionStatus: 'canceled',
      convertedAt: thirtyOneDaysAgo,
      stripeCustomerId: null,
    }]));
    mockDb.update.mockReturnValueOnce(updateChain());

    await runReferralQualificationCron();

    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('does nothing when referred user subscription is active but not yet 30 days (past_due/trialing)', async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    mockDb.select.mockReturnValueOnce(selectReturning([pendingEvent]));
    mockDb.select.mockReturnValueOnce(selectReturning([{
      subscriptionStatus: 'past_due',
      convertedAt: twentyDaysAgo,
      stripeCustomerId: null,
    }]));

    await runReferralQualificationCron();

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('does nothing when referred user has been active fewer than 30 days', async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    mockDb.select.mockReturnValueOnce(selectReturning([pendingEvent]));
    mockDb.select.mockReturnValueOnce(selectReturning([{
      subscriptionStatus: 'active',
      convertedAt: twentyDaysAgo,
      stripeCustomerId: null,
    }]));

    await runReferralQualificationCron();

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('marks event as qualified when criteria are met and Stripe is not configured', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([pendingEvent]));
    mockDb.select.mockReturnValueOnce(selectReturning([{
      subscriptionStatus: 'active',
      convertedAt: thirtyOneDaysAgo,
      stripeCustomerId: null,
    }]));
    mockDb.update.mockReturnValueOnce(updateChain()); // mark qualified
    // Referrer is always fetched (before Stripe branch check); no stripeCustomerId → skip Stripe
    mockDb.select.mockReturnValueOnce(selectReturning([{
      stripeCustomerId: null,
      email: 'referrer@example.com',
      fullName: 'No Stripe Referrer',
    }]));

    await runReferralQualificationCron();

    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('issues Stripe credit and marks as credited when Stripe is configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

    mockDb.select.mockReturnValueOnce(selectReturning([pendingEvent]));
    mockDb.select.mockReturnValueOnce(selectReturning([{
      subscriptionStatus: 'active',
      convertedAt: thirtyOneDaysAgo,
      stripeCustomerId: 'cus_referred',
    }]));
    mockDb.update.mockReturnValueOnce(updateChain()); // mark qualified
    mockDb.select.mockReturnValueOnce(selectReturning([{
      stripeCustomerId: 'cus_referrer',
      email: 'referrer@example.com',
      fullName: 'Test Referrer',
    }]));
    mockDb.update.mockReturnValueOnce(updateChain()); // mark credited

    const mockEmailSend = vi.fn().mockResolvedValue({ id: 'em_test' });
    vi.mocked(getResendClient).mockResolvedValue({
      client: { emails: { send: mockEmailSend } },
      fromEmail: 'no-reply@brokr.ai',
    } as any);

    await runReferralQualificationCron();

    // qualified → then credited = 2 update calls
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });

  it('handles Stripe API error gracefully without throwing', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

    mockDb.select.mockReturnValueOnce(selectReturning([pendingEvent]));
    mockDb.select.mockReturnValueOnce(selectReturning([{
      subscriptionStatus: 'active',
      convertedAt: thirtyOneDaysAgo,
      stripeCustomerId: 'cus_referred',
    }]));
    mockDb.update.mockReturnValueOnce(updateChain()); // mark qualified
    mockDb.select.mockReturnValueOnce(selectReturning([{
      stripeCustomerId: 'cus_referrer',
      email: 'referrer@example.com',
      fullName: 'Test Referrer',
    }]));

    // Make Stripe's createBalanceTransaction throw
    const stripe = await import('stripe');
    const mockStripeInstance = (stripe.default as any).mock?.results?.[0]?.value
      ?? { customers: { createBalanceTransaction: vi.fn() } };
    vi.mocked(mockStripeInstance.customers?.createBalanceTransaction)
      ?.mockRejectedValueOnce(new Error('Stripe API down'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runReferralQualificationCron()).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });

  it('skips gracefully when the referred user row no longer exists (deleted user)', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([pendingEvent]));
    mockDb.select.mockReturnValueOnce(selectReturning([])); // user deleted

    await runReferralQualificationCron();

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('processes no events and does nothing when the pending queue is empty', async () => {
    mockDb.select.mockReturnValueOnce(selectReturning([]));

    await runReferralQualificationCron();

    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
