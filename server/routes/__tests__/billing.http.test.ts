/**
 * HTTP-level security tests for billing routes.
 * Verifies auth gating and webhook signature enforcement.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock stripe singleton before importing billing routes
vi.mock('../../lib/stripe', () => ({
  getStripeClient: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn(() => { throw new Error('Invalid signature'); }),
    },
    billingPortal: {
      sessions: { create: vi.fn() },
    },
  })),
}));

// Mock @shared/schema — billing routes only use users table reference for drizzle eq()
vi.mock('@shared/schema', () => ({
  users: { id: 'id', stripeCustomerId: 'stripeCustomerId' },
}));

// Mock Resend email client so cron tests don't hit external APIs
vi.mock('../../email', () => ({
  getResendClient: vi.fn(),
}));

// Mock referral service so cron/referral-qualify doesn't hit the DB
vi.mock('../../services/referral', () => ({
  runReferralQualificationCron: vi.fn().mockResolvedValue(undefined),
}));

import { registerBillingRoutes } from '../billing';
import { getResendClient } from '../../email';
import { runReferralQualificationCron } from '../../services/referral';

function buildApp(opts: { authed?: boolean; userId?: number } = {}) {
  const app = express();
  app.use((req: any, _res, next) => {
    // Capture rawBody for webhook tests; also parse JSON for routes that use req.body
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk; });
    req.on('end', () => {
      (req as any).rawBody = data;
      if (data && (req.headers['content-type'] ?? '').includes('application/json')) {
        try { req.body = JSON.parse(data); } catch { /* ignore malformed */ }
      }
      next();
    });
  });

  const authenticateUser = vi.fn((req: any, res: any, next: any) => {
    if (opts.authed) {
      req.user = { id: opts.userId ?? 42 };
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  const db = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    }),
  };

  registerBillingRoutes(app, { db, authenticateUser });
  return { app, authenticateUser, db };
}

describe('GET /api/billing/subscription — auth gating', () => {
  it('returns 401 when unauthenticated', async () => {
    const { app } = buildApp({ authed: false });
    const res = await request(app).get('/api/billing/subscription');
    expect(res.status).toBe(401);
  });

  it('returns 404 when authed but no user record found', async () => {
    const { app } = buildApp({ authed: true, userId: 99 });
    const res = await request(app).get('/api/billing/subscription');
    expect(res.status).toBe(404);
  });

  it('returns 200 with subscription data when authed and user exists', async () => {
    const { app, db } = buildApp({ authed: true, userId: 1 });
    const userData = {
      subscriptionStatus: 'trialing',
      subscriptionTier: null,
      billingPeriod: null,
      foundingBroker: true,
      foundingDiscountRate: 20,
      trialEndsAt: null,
      convertedAt: null,
      pilotActivatedAt: null,
    };
    // Override the mock to return a user
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([userData]) }),
    });

    const res = await request(app).get('/api/billing/subscription');
    expect(res.status).toBe(200);
    expect(res.body.subscriptionStatus).toBe('trialing');
  });
});

describe('POST /api/billing/portal — auth gating', () => {
  it('returns 401 when unauthenticated', async () => {
    const { app } = buildApp({ authed: false });
    const res = await request(app).post('/api/billing/portal');
    expect(res.status).toBe(401);
  });

  it('returns 400 when authed but no stripeCustomerId on account', async () => {
    const { app } = buildApp({ authed: true, userId: 1 });
    // db.select returns empty user (no stripeCustomerId)
    const res = await request(app).post('/api/billing/portal');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No billing account/);
  });
});

describe('POST /api/billing/webhook — signature enforcement', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/billing/webhook')
      .send('{}');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing stripe-signature/);
  });

  it('returns 400 when stripe-signature is invalid (signature mismatch)', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('stripe-signature', 't=1234,v1=invalid_sig')
      .send('{}');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Webhook Error/);
  });

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('stripe-signature', 't=1234,v1=sig')
      .send('{}');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/not configured/);
  });
});

describe('POST /api/billing/checkout — auth gating and validation', () => {
  afterEach(() => {
    delete process.env.STRIPE_PRICE_ID_STARTER_MONTHLY;
  });

  it('returns 401 when unauthenticated', async () => {
    const { app } = buildApp({ authed: false });
    const res = await request(app)
      .post('/api/billing/checkout')
      .send({ tier: 'starter', period: 'monthly' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when tier and period are missing', async () => {
    const { app } = buildApp({ authed: true });
    const res = await request(app).post('/api/billing/checkout').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tier and period are required/);
  });

  it('returns 400 when tier is invalid', async () => {
    const { app } = buildApp({ authed: true });
    const res = await request(app)
      .post('/api/billing/checkout')
      .send({ tier: 'enterprise', period: 'monthly' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid tier/);
  });

  it('returns 400 when user is already active', async () => {
    const { app, db } = buildApp({ authed: true, userId: 1 });
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          email: 'test@example.com',
          foundingBroker: false,
          stripeCustomerId: 'cus_existing',
          subscriptionStatus: 'active',
        }]),
      }),
    });
    const res = await request(app)
      .post('/api/billing/checkout')
      .send({ tier: 'starter', period: 'monthly' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Already subscribed/);
  });

  it('returns 503 with PRICE_NOT_CONFIGURED when env var is not set', async () => {
    delete process.env.STRIPE_PRICE_ID_STARTER_MONTHLY;
    const { app, db } = buildApp({ authed: true, userId: 1 });
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          email: 'test@example.com',
          foundingBroker: false,
          stripeCustomerId: null,
          subscriptionStatus: 'trialing',
        }]),
      }),
    });
    const res = await request(app)
      .post('/api/billing/checkout')
      .send({ tier: 'starter', period: 'monthly' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('PRICE_NOT_CONFIGURED');
  });
});

describe('POST /api/cron/pilot-conversion — key authentication', () => {
  afterEach(() => {
    delete process.env.CRON_SECRET_KEY;
  });

  it('returns 503 when CRON_SECRET_KEY is not set', async () => {
    delete process.env.CRON_SECRET_KEY;
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/cron/pilot-conversion')
      .set('x-cron-key', 'any-key');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/);
  });

  it('returns 401 when x-cron-key is wrong', async () => {
    process.env.CRON_SECRET_KEY = 'correct-secret';
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/cron/pilot-conversion')
      .set('x-cron-key', 'wrong-key');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Unauthorized/);
  });

  it('returns 200 with zero counts when correct key and no eligible candidates', async () => {
    process.env.CRON_SECRET_KEY = 'correct-secret';
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/cron/pilot-conversion')
      .set('x-cron-key', 'correct-secret');
    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(0);
    expect(res.body.skipped).toBe(0);
  });
});

describe('POST /api/cron/pilot-conversion — email send path', () => {
  const EIGHTY_DAYS_AGO = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    process.env.CRON_SECRET_KEY = 'test-cron-secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET_KEY;
    vi.clearAllMocks();
  });

  it('sends Day-75 email to eligible pilot broker and returns sent: 1', async () => {
    const emailSend = vi.fn().mockResolvedValue({ id: 'email-id-123' });
    vi.mocked(getResendClient).mockResolvedValue({
      client: { emails: { send: emailSend } } as any,
      fromEmail: 'noreply@brokr.ai',
    });

    const { app, db } = buildApp();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 100,
          email: 'jane@brokerage.com',
          fullName: 'Jane Broker',
          foundingBroker: false,
          subscriptionStatus: 'trialing',
          pilotActivatedAt: EIGHTY_DAYS_AGO,
        }]),
      }),
    });

    const res = await request(app)
      .post('/api/cron/pilot-conversion')
      .set('x-cron-key', 'test-cron-secret');

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
    expect(res.body.skipped).toBe(0);
    expect(emailSend).toHaveBeenCalledOnce();
    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@brokerage.com',
    }));
  });

  it('includes founding broker callout for founding brokers', async () => {
    const emailSend = vi.fn().mockResolvedValue({ id: 'email-id-456' });
    vi.mocked(getResendClient).mockResolvedValue({
      client: { emails: { send: emailSend } } as any,
      fromEmail: 'noreply@brokr.ai',
    });

    const { app, db } = buildApp();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 101,
          email: 'founder@brokerage.com',
          fullName: 'Founding Frank',
          foundingBroker: true,
          subscriptionStatus: 'trialing',
          pilotActivatedAt: EIGHTY_DAYS_AGO,
        }]),
      }),
    });

    const res = await request(app)
      .post('/api/cron/pilot-conversion')
      .set('x-cron-key', 'test-cron-secret');

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
    const callArgs = emailSend.mock.calls[0][0];
    expect(callArgs.subject).toContain('Founding Broker');
    expect(callArgs.html).toContain('Founding Broker');
    // founding broker callout shows both monthly and annual founding rates
    expect(callArgs.html).toContain('$79/mo');   // founding monthly starter
    expect(callArgs.html).toContain('$63/mo');   // founding annual starter
    expect(callArgs.html).toContain('$127/mo');  // founding annual pro
    expect(callArgs.html).toContain('$255/mo');  // founding annual team
  });

  it('shows annual pricing table with Save 20% callout for non-founding brokers', async () => {
    const emailSend = vi.fn().mockResolvedValue({ id: 'email-id-789' });
    vi.mocked(getResendClient).mockResolvedValue({
      client: { emails: { send: emailSend } } as any,
      fromEmail: 'noreply@brokr.ai',
    });

    const { app, db } = buildApp();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 103,
          email: 'regular@brokerage.com',
          fullName: 'Regular Rita',
          foundingBroker: false,
          subscriptionStatus: 'trialing',
          pilotActivatedAt: EIGHTY_DAYS_AGO,
        }]),
      }),
    });

    const res = await request(app)
      .post('/api/cron/pilot-conversion')
      .set('x-cron-key', 'test-cron-secret');

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
    const callArgs = emailSend.mock.calls[0][0];
    // standard pricing table includes both monthly and annual columns
    expect(callArgs.html).toContain('$99/mo');   // standard monthly starter
    expect(callArgs.html).toContain('$79/mo');   // standard annual starter
    expect(callArgs.html).toContain('$199/mo');  // standard monthly pro
    expect(callArgs.html).toContain('$159/mo');  // standard annual pro
    expect(callArgs.html).toContain('$399/mo');  // standard monthly team
    expect(callArgs.html).toContain('$319/mo');  // standard annual team
    expect(callArgs.html).toContain('Save 20%');
  });

  it('skips already-active broker and returns skipped: 1 without sending email', async () => {
    const emailSend = vi.fn();
    vi.mocked(getResendClient).mockResolvedValue({
      client: { emails: { send: emailSend } } as any,
      fromEmail: 'noreply@brokr.ai',
    });

    const { app, db } = buildApp();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 102,
          email: 'active@brokerage.com',
          fullName: 'Active Bob',
          foundingBroker: true,
          subscriptionStatus: 'active',
          pilotActivatedAt: EIGHTY_DAYS_AGO,
        }]),
      }),
    });

    const res = await request(app)
      .post('/api/cron/pilot-conversion')
      .set('x-cron-key', 'test-cron-secret');

    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(0);
    expect(res.body.skipped).toBe(1);
    expect(emailSend).not.toHaveBeenCalled();
  });
});

describe('POST /api/cron/referral-qualify — key authentication', () => {
  afterEach(() => {
    delete process.env.CRON_SECRET_KEY;
    vi.clearAllMocks();
  });

  it('returns 503 when CRON_SECRET_KEY is not set', async () => {
    delete process.env.CRON_SECRET_KEY;
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/cron/referral-qualify')
      .set('x-cron-key', 'any-key');
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/);
  });

  it('returns 401 when x-cron-key is wrong', async () => {
    process.env.CRON_SECRET_KEY = 'correct-secret';
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/cron/referral-qualify')
      .set('x-cron-key', 'wrong-key');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Unauthorized/);
  });

  it('returns 200 and invokes runReferralQualificationCron when key is correct', async () => {
    process.env.CRON_SECRET_KEY = 'correct-secret';
    vi.mocked(runReferralQualificationCron).mockResolvedValue(undefined);
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/cron/referral-qualify')
      .set('x-cron-key', 'correct-secret');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(runReferralQualificationCron).toHaveBeenCalledOnce();
  });

  it('returns 500 when runReferralQualificationCron throws', async () => {
    process.env.CRON_SECRET_KEY = 'correct-secret';
    vi.mocked(runReferralQualificationCron).mockRejectedValue(new Error('DB error'));
    const { app } = buildApp();
    const res = await request(app)
      .post('/api/cron/referral-qualify')
      .set('x-cron-key', 'correct-secret');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Internal server error/);
  });
});
