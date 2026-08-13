import type { Express, Request, Response } from 'express';
import type { AuthRequest } from '../auth';
import { getOrCreateReferralCode, getReferralStats } from '../services/referral';

export function registerReferralRoutes(
  app: Express,
  authenticateUser: (req: AuthRequest, res: Response, next: Function) => void
) {
  // Public redirect: set brokr_ref cookie and send user to /register
  app.get('/ref/:code', (req: Request, res: Response) => {
    const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;

    if (!code || !/^[A-Z0-9]{6,12}$/.test(code)) {
      return res.redirect(302, '/register');
    }

    res.cookie('brokr_ref', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.redirect(301, '/register');
  });

  // GET /api/settings/referral — returns the referral link, code, and stats for the authenticated broker
  app.get('/api/settings/referral', authenticateUser, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'broker') {
      return res.status(403).json({ error: 'Referral program is for broker users only' });
    }

    try {
      const stats = await getReferralStats(req.user!.id);
      return res.json(stats);
    } catch (err: any) {
      console.error('[referral] GET /api/settings/referral error:', err);
      return res.status(500).json({ error: 'Failed to load referral info' });
    }
  });
}
