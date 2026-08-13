/**
 * HTTP-level tests for the broker SDR stats endpoint.
 * Focuses on the openRate calculation to guard against regression of the
 * bug fixed in 0b9ec9e (openRate was always 100% because the "opened" query
 * was identical to the "sent" query and never filtered by isNotNull(openedAt)).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// vi.mock calls are hoisted before imports; mock modules before routes are loaded

vi.mock('../../db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      brokerContacts: { findMany: vi.fn() },
      brokerOutreachMessages: { findMany: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../auth', () => ({
  authenticateUser: vi.fn((req: any, _res: any, next: any) => {
    req.user = { id: 42 };
    next();
  }),
}));

vi.mock('@shared/schema', () => ({
  brokerContacts: {},
  brokerOutreachMessages: {},
  users: {},
}));

vi.mock('../../services/brokerSdr', () => ({
  generateOutreachMessages: vi.fn(),
  saveDraftMessages: vi.fn(),
  sendOutreachMessage: vi.fn(),
  sendBatchMessages: vi.fn(),
  suggestAutomations: vi.fn(),
}));

import { db } from '../../db';
import { registerBrokerSdrRoutes } from '../broker-sdr';

function buildApp() {
  const app = express();
  app.use(express.json());
  registerBrokerSdrRoutes(app);
  return app;
}

const mockDb = db as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/broker/stats — openRate calculation', () => {
  beforeEach(() => {
    // requireBroker middleware always resolves to a valid broker user
    mockDb.query.users.findFirst.mockResolvedValue({ id: 42, role: 'broker' });
    // Default: no contacts
    mockDb.query.brokerContacts.findMany.mockResolvedValue([]);
  });

  it('returns openRate 0 when no messages were sent this month', async () => {
    mockDb.query.brokerOutreachMessages.findMany
      .mockResolvedValueOnce([]) // sentThisWeek
      .mockResolvedValueOnce([]) // sentThisMonth
      .mockResolvedValueOnce([]); // openedThisMonth

    const res = await request(buildApp()).get('/api/broker/stats');

    expect(res.status).toBe(200);
    expect(res.body.openRate).toBe(0);
  });

  it('returns openRate 50 when half of sent messages were opened', async () => {
    const sentThisMonth = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const openedThisMonth = [{ id: 1 }, { id: 3 }];

    mockDb.query.brokerOutreachMessages.findMany
      .mockResolvedValueOnce([])          // sentThisWeek
      .mockResolvedValueOnce(sentThisMonth) // sentThisMonth (4)
      .mockResolvedValueOnce(openedThisMonth); // openedThisMonth (2)

    const res = await request(buildApp()).get('/api/broker/stats');

    expect(res.status).toBe(200);
    expect(res.body.openRate).toBe(50);
  });

  it('returns openRate 100 when all sent messages were opened', async () => {
    const messages = [{ id: 1 }, { id: 2 }];

    mockDb.query.brokerOutreachMessages.findMany
      .mockResolvedValueOnce([])       // sentThisWeek
      .mockResolvedValueOnce(messages) // sentThisMonth (2)
      .mockResolvedValueOnce(messages); // openedThisMonth (2 — same 2)

    const res = await request(buildApp()).get('/api/broker/stats');

    expect(res.status).toBe(200);
    expect(res.body.openRate).toBe(100);
  });

  it('regression (0b9ec9e): openRate uses opened count, not sent count', async () => {
    // Before the fix, the "opened" query fetched all sent messages (no isNotNull filter),
    // so opened.length == sent.length → openRate was always 100%.
    // After the fix, only messages with non-null openedAt are counted.
    const sentThisMonth = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const openedThisMonth = sentThisMonth.slice(0, 3); // only 3 of 10 were opened

    mockDb.query.brokerOutreachMessages.findMany
      .mockResolvedValueOnce([])           // sentThisWeek
      .mockResolvedValueOnce(sentThisMonth) // sentThisMonth (10)
      .mockResolvedValueOnce(openedThisMonth); // openedThisMonth (3)

    const res = await request(buildApp()).get('/api/broker/stats');

    expect(res.status).toBe(200);
    expect(res.body.openRate).toBe(30); // 3/10 * 100, not 100
  });
});

describe('GET /api/broker/stats — role gating', () => {
  it('returns 403 when authenticated user is not a broker', async () => {
    mockDb.query.users.findFirst.mockResolvedValue({ id: 42, role: 'lender' });

    const res = await request(buildApp()).get('/api/broker/stats');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Broker access required');
  });

  it('returns 403 when the user record is not found in DB', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/broker/stats');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Broker access required');
  });
});

describe('GET /api/broker/stats — response shape', () => {
  beforeEach(() => {
    mockDb.query.users.findFirst.mockResolvedValue({ id: 42, role: 'broker' });
  });

  it('includes contact counts and message counts in response', async () => {
    const contacts = [
      { isActive: true, lastContactedAt: null },
      { isActive: false, lastContactedAt: null },
      { isActive: true, lastContactedAt: null },
    ];
    mockDb.query.brokerContacts.findMany.mockResolvedValue(contacts);
    mockDb.query.brokerOutreachMessages.findMany
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])             // sentThisWeek
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]) // sentThisMonth
      .mockResolvedValueOnce([{ id: 1 }]);                        // openedThisMonth

    const res = await request(buildApp()).get('/api/broker/stats');

    expect(res.status).toBe(200);
    expect(res.body.totalContacts).toBe(3);
    expect(res.body.activeContacts).toBe(2);
    expect(res.body.messagesSentThisWeek).toBe(2);
    expect(res.body.messagesSentThisMonth).toBe(3);
    expect(res.body.openRate).toBeCloseTo(33.33, 1);
  });
});
