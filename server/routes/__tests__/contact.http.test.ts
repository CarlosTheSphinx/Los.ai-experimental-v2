/**
 * Unit tests for POST /api/public/contact.
 * Covers: 400 validation, 200 success, HTML escaping (ORC-250 regression), graceful email failure.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { mockEmailsSend } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn().mockResolvedValue({ id: 'msg-1' }),
}));

vi.mock('../../email', () => ({
  getResendClient: vi.fn().mockResolvedValue({
    client: { emails: { send: mockEmailsSend } },
    fromEmail: 'noreply@test.com',
  }),
}));

// digestService imports db.ts at module load, which requires DATABASE_URL.
// Mock only escapeHtml (a pure function) to keep the test DB-free.
vi.mock('../../digestService', () => ({
  escapeHtml: (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;'),
}));

import { registerContactRoutes } from '../contact';

function buildApp() {
  const app = express();
  app.use(express.json());
  registerContactRoutes(app);
  return app;
}

const VALID_BODY = { name: 'Alice', email: 'alice@example.com', message: 'Hello there' };

describe('POST /api/public/contact', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/public/contact')
      .send({ email: 'alice@example.com', message: 'Hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(buildApp())
      .post('/api/public/contact')
      .send({ name: 'Alice', message: 'Hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(buildApp())
      .post('/api/public/contact')
      .send({ name: 'Alice', email: 'alice@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/i);
  });

  it('returns 200 with success on a valid submission', async () => {
    const res = await request(buildApp())
      .post('/api/public/contact')
      .send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('escapes HTML in name field before embedding in email body (ORC-250 regression)', async () => {
    await request(buildApp())
      .post('/api/public/contact')
      .send({ name: '<script>alert(1)</script>', email: 'x@x.com', message: 'Hi' });

    expect(mockEmailsSend).toHaveBeenCalledOnce();
    const { html, subject } = mockEmailsSend.mock.calls[0][0];
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(subject).not.toContain('<script>');
  });

  it('returns 200 even when email send throws (graceful degradation)', async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error('SMTP timeout'));
    const res = await request(buildApp())
      .post('/api/public/contact')
      .send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
