import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncSubscription, resolveSubscriptionTier, lookupCheckoutPriceId } from '../billing';

function makeMockDb(existingUser: { convertedAt: Date | null } | null = null) {
  const whereUpdate = vi.fn().mockResolvedValue(undefined);
  const setMock = vi.fn().mockReturnValue({ where: whereUpdate });
  const updateMock = vi.fn().mockReturnValue({ set: setMock });

  const whereSelect = vi.fn().mockResolvedValue(existingUser ? [existingUser] : []);
  const fromMock = vi.fn().mockReturnValue({ where: whereSelect });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });

  return { db: { select: selectMock, update: updateMock }, setMock, whereUpdate };
}

function makeSubscription(overrides: Record<string, any> = {}) {
  return {
    id: 'sub_test',
    customer: 'cus_test',
    status: 'active',
    trial_end: null,
    items: { data: [{ price: { id: 'price_starter_monthly', recurring: { interval: 'month' } } }] },
    ...overrides,
  };
}

describe('resolveSubscriptionTier', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_IDS_STARTER = 'price_starter_monthly,price_starter_annual';
    process.env.STRIPE_PRICE_IDS_PRO = 'price_pro_monthly,price_pro_annual';
    process.env.STRIPE_PRICE_IDS_TEAM = 'price_team_monthly,price_team_annual';
  });

  afterEach(() => {
    delete process.env.STRIPE_PRICE_IDS_STARTER;
    delete process.env.STRIPE_PRICE_IDS_PRO;
    delete process.env.STRIPE_PRICE_IDS_TEAM;
  });

  it('returns starter for a starter price ID', () => {
    const sub = makeSubscription({ items: { data: [{ price: { id: 'price_starter_monthly', recurring: { interval: 'month' } } }] } });
    expect(resolveSubscriptionTier(sub)).toBe('starter');
  });

  it('returns pro for a pro price ID', () => {
    const sub = makeSubscription({ items: { data: [{ price: { id: 'price_pro_annual', recurring: { interval: 'year' } } }] } });
    expect(resolveSubscriptionTier(sub)).toBe('pro');
  });

  it('returns team for a team price ID', () => {
    const sub = makeSubscription({ items: { data: [{ price: { id: 'price_team_monthly', recurring: { interval: 'month' } } }] } });
    expect(resolveSubscriptionTier(sub)).toBe('team');
  });

  it('returns null and warns for an unrecognized price ID', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sub = makeSubscription({ items: { data: [{ price: { id: 'price_unknown_xyz', recurring: { interval: 'month' } } }] } });
    const result = resolveSubscriptionTier(sub);
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('price_unknown_xyz'));
    warnSpy.mockRestore();
  });

  it('returns null without warning when no price ID is present', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sub = makeSubscription({ items: { data: [] } });
    expect(resolveSubscriptionTier(sub)).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('syncSubscription', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_IDS_STARTER = 'price_starter_monthly';
    process.env.STRIPE_PRICE_IDS_PRO = 'price_pro_monthly';
    process.env.STRIPE_PRICE_IDS_TEAM = 'price_team_monthly';
  });

  afterEach(() => {
    delete process.env.STRIPE_PRICE_IDS_STARTER;
    delete process.env.STRIPE_PRICE_IDS_PRO;
    delete process.env.STRIPE_PRICE_IDS_TEAM;
  });

  it('stamps convertedAt on first activation (no existing convertedAt)', async () => {
    const { db, setMock } = makeMockDb({ convertedAt: null });
    const sub = makeSubscription({ status: 'active' });

    await syncSubscription(sub, db);

    const setCall = setMock.mock.calls[0][0];
    expect(setCall.convertedAt).toBeInstanceOf(Date);
    expect(setCall.subscriptionStatus).toBe('active');
    expect(setCall.subscriptionTier).toBe('starter');
  });

  it('does NOT overwrite convertedAt on plan change when convertedAt already exists', async () => {
    const existingDate = new Date('2026-01-01T00:00:00Z');
    const { db, setMock } = makeMockDb({ convertedAt: existingDate });
    const sub = makeSubscription({ status: 'active' });

    await syncSubscription(sub, db);

    const setCall = setMock.mock.calls[0][0];
    expect(setCall.convertedAt).toBeUndefined();
    expect(setCall.subscriptionStatus).toBe('active');
  });

  it('updates subscriptionStatus on status transitions (e.g. past_due)', async () => {
    const { db, setMock } = makeMockDb({ convertedAt: new Date() });
    const sub = makeSubscription({ status: 'past_due' });

    await syncSubscription(sub, db);

    const setCall = setMock.mock.calls[0][0];
    expect(setCall.subscriptionStatus).toBe('past_due');
    expect(setCall.convertedAt).toBeUndefined();
  });

  it('sets billingPeriod to annual when interval is year', async () => {
    const { db, setMock } = makeMockDb({ convertedAt: null });
    const sub = makeSubscription({
      status: 'active',
      items: { data: [{ price: { id: 'price_starter_monthly', recurring: { interval: 'year' } } }] },
    });

    await syncSubscription(sub, db);

    const setCall = setMock.mock.calls[0][0];
    expect(setCall.billingPeriod).toBe('annual');
  });

  it('sets billingPeriod to monthly when interval is month', async () => {
    const { db, setMock } = makeMockDb({ convertedAt: null });
    const sub = makeSubscription({ status: 'active' });

    await syncSubscription(sub, db);

    const setCall = setMock.mock.calls[0][0];
    expect(setCall.billingPeriod).toBe('monthly');
  });
});

describe('lookupCheckoutPriceId', () => {
  afterEach(() => {
    for (const key of Object.keys(process.env).filter(k => k.startsWith('STRIPE_PRICE_ID_'))) {
      delete process.env[key];
    }
  });

  it('returns the env var value for a standard monthly tier', () => {
    process.env.STRIPE_PRICE_ID_STARTER_MONTHLY = 'price_starter_mo_test';
    expect(lookupCheckoutPriceId('starter', 'monthly', false)).toBe('price_starter_mo_test');
  });

  it('returns the founding variant when foundingBroker is true', () => {
    process.env.STRIPE_PRICE_ID_PRO_ANNUAL_FOUNDING = 'price_pro_ann_founding_test';
    expect(lookupCheckoutPriceId('pro', 'annual', true)).toBe('price_pro_ann_founding_test');
  });

  it('returns null when the env var is not set', () => {
    expect(lookupCheckoutPriceId('team', 'monthly', false)).toBeNull();
  });

  it('returns null for an unknown tier/period combination', () => {
    expect(lookupCheckoutPriceId('enterprise', 'monthly', false)).toBeNull();
  });

  it('uses standard price when foundingBroker=true but founding env var is not set', () => {
    // founding var not set, standard var also not set — should return null
    expect(lookupCheckoutPriceId('starter', 'annual', true)).toBeNull();
  });
});
