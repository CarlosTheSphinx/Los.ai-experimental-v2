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

import { registerBillingRoutes } from '../billing';

function buildApp(opts: { authed?: boolean; userId?: number } = {}) {
  const app = express();
  app.use((req: any, _res, next) => {
    // Capture rawBody for webhook tests
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk; });
    req.on('end', () => { (req as any).rawBody = data; next(); });
  });
  app.use(express.json());

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
