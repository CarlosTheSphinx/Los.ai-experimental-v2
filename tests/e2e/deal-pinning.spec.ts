/**
 * Phase 2 — Deal Pinning (8 scenarios)
 * POST /api/email/threads/:threadId/pin-to-pipeline
 */
import { test, expect } from '@playwright/test';

async function loginApi(request: import('@playwright/test').APIRequestContext, email: string, password: string): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { email, password } });
  if (!res.ok()) throw new Error(`Login failed (${res.status()}) for ${email}`);
  const body = await res.json();
  if (body.token) return body.token;
  const m = (res.headers()['set-cookie'] ?? '').match(/auth_token=([^;]+)/);
  if (m) return m[1];
  throw new Error('No token in login response');
}

const LENDER   = { email: process.env.TEST_LENDER_EMAIL   ?? 'test-lender@losai.test',   password: process.env.TEST_LENDER_PASSWORD   ?? 'TestPassword123!' };
const LENDER2  = { email: process.env.TEST_LENDER2_EMAIL  ?? 'test-lender2@losai.test',  password: process.env.TEST_LENDER2_PASSWORD  ?? 'TestPassword123!' };
const BORROWER = { email: process.env.TEST_BORROWER_EMAIL ?? 'test-borrower@losai.test', password: process.env.TEST_BORROWER_PASSWORD ?? 'TestPassword123!' };

test('P2-1: pin — no token → 401', async ({ request }) => {
  expect((await request.post('/api/email/threads/1/pin-to-pipeline')).status()).toBe(401);
});
test('P2-2: borrower pin → 403', async ({ request }) => {
  const tok = await loginApi(request, BORROWER.email, BORROWER.password);
  const res = await request.post('/api/email/threads/1/pin-to-pipeline', { headers: { Authorization: `Bearer ${tok}` } });
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toMatch(/lender/i);
});
test('P2-3: lender pins valid thread → 200 + submissionId', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const res = await request.post(`/api/email/threads/${threads[0].id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } });
  expect(res.status()).toBe(200);
  expect(typeof (await res.json()).submissionId).toBe('number');
});
test('P2-4: duplicate pin → alreadyPinned: true', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const id = threads[0].id;
  await request.post(`/api/email/threads/${id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } });
  const r2 = await (await request.post(`/api/email/threads/${id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } })).json();
  expect(r2.alreadyPinned).toBe(true);
});
test('P2-5: non-numeric thread ID → 400', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  expect((await request.post('/api/email/threads/not-a-number/pin-to-pipeline', { headers: { Authorization: `Bearer ${tok}` } })).status()).toBe(400);
});
test('P2-6: non-existent thread → 404', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  expect((await request.post('/api/email/threads/999999999/pin-to-pipeline', { headers: { Authorization: `Bearer ${tok}` } })).status()).toBe(404);
});
test('P2-7 [P0]: cross-user pin → 403', async ({ request }) => {
  const tok1 = await loginApi(request, LENDER.email, LENDER.password);
  const tok2 = await loginApi(request, LENDER2.email, LENDER2.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok2}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const res = await request.post(`/api/email/threads/${threads[0].id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok1}` } });
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toMatch(/access denied/i);
});
test('P2-8 [P2-bug]: DELETE pinned thread → not 500', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const id = threads[0].id;
  await request.post(`/api/email/threads/${id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } });
  expect((await request.delete(`/api/email/threads/${id}`, { headers: { Authorization: `Bearer ${tok}` } })).status()).not.toBe(500);
});
