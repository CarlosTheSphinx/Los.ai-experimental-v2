/**
 * HTTP-level tests for referral routes.
 * Covers: GET /ref/:code (cookie + redirect), GET /api/settings/referral (auth/role gating).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../services/referral', () => ({
  getOrCreateReferralCode: vi.fn().mockResolvedValue('TESTCODE8'),
  getReferralStats: vi.fn().mockResolvedValue({
    referralLink: 'https://brokr.ai/ref/TESTCODE8',
    code: 'TESTCODE8',
    totalReferrals: 3,
    qualifiedReferrals: 1,
    pendingReferrals: 2,
  }),
}));

import { registerReferralRoutes } from '../referral';
import { getReferralStats } from '../../services/referral';

function buildApp(opts: { authed?: boolean; userId?: number; role?: string } = {}) {
  const app = express();
  app.use(express.json());

  const authenticateUser = vi.fn((req: any, res: any, next: any) => {
    if (opts.authed) {
      req.user = { id: opts.userId ?? 42, role: opts.role ?? 'broker' };
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  registerReferralRoutes(app, authenticateUser);
  return { app, authenticateUser };
}

describe('GET /ref/:code — referral redirect', () => {
  it('redirects to /register and sets brokr_ref cookie for a valid code', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/ref/ABCD1234').redirects(0);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/register');
    const setCookie = res.headers['set-cookie'] as string[] | string;
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
    expect(cookies.some((c: string) => c.startsWith('brokr_ref=ABCD1234'))).toBe(true);
  });

  it('redirects to /register without a cookie for an invalid code (too short)', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/ref/AB').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/register');
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeUndefined();
  });

  it('redirects to /register without a cookie for an invalid code (special chars)', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/ref/invalid!@#code').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/register');
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeUndefined();
  });
});

describe('GET /api/settings/referral — auth and role gating', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    const { app } = buildApp({ authed: false });
    const res = await request(app).get('/api/settings/referral');
    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated user is not a broker', async () => {
    const { app } = buildApp({ authed: true, role: 'lender' });
    const res = await request(app).get('/api/settings/referral');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/broker/i);
  });

  it('returns 200 with referral stats for an authenticated broker', async () => {
    const { app } = buildApp({ authed: true, userId: 7, role: 'broker' });
    const res = await request(app).get('/api/settings/referral');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('TESTCODE8');
    expect(res.body.totalReferrals).toBe(3);
    expect(res.body.qualifiedReferrals).toBe(1);
    expect(res.body.referralLink).toContain('/ref/TESTCODE8');
  });

  it('returns 500 when getReferralStats throws', async () => {
    vi.mocked(getReferralStats).mockRejectedValueOnce(new Error('DB unavailable'));
    const { app } = buildApp({ authed: true, role: 'broker' });
    const res = await request(app).get('/api/settings/referral');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to load referral info/);
  });
});
