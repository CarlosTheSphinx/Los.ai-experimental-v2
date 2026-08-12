/**
 * Phase 1 — Lender Email Inbox (10 scenarios)
 * Auth gating (401), cross-user access (P0), thread API flows.
 *
 * Run against: APP_URL=http://localhost:5000 npx playwright test lender-inbox
 * Seed: TEST_LENDER_EMAIL, TEST_LENDER_PASSWORD, TEST_LENDER2_EMAIL, TEST_LENDER2_PASSWORD
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

const LENDER  = { email: process.env.TEST_LENDER_EMAIL  ?? 'test-lender@losai.test',  password: process.env.TEST_LENDER_PASSWORD  ?? 'TestPassword123!' };
const LENDER2 = { email: process.env.TEST_LENDER2_EMAIL ?? 'test-lender2@losai.test', password: process.env.TEST_LENDER2_PASSWORD ?? 'TestPassword123!' };

test('P1-1: GET /api/email/threads — no token → 401', async ({ request }) => {
  expect((await request.get('/api/email/threads')).status()).toBe(401);
});
test('P1-2: GET /api/email/threads/:id — no token → 401', async ({ request }) => {
  expect((await request.get('/api/email/threads/1')).status()).toBe(401);
});
test('P1-3: POST reply — no token → 401', async ({ request }) => {
  expect((await request.post('/api/email/threads/1/reply', { data: { body: 'hi' } })).status()).toBe(401);
});
test('P1-4: POST link — no token → 401', async ({ request }) => {
  expect((await request.post('/api/email/threads/1/link', { data: { dealId: 1 } })).status()).toBe(401);
});
test('P1-5: DELETE thread — no token → 401', async ({ request }) => {
  expect((await request.delete('/api/email/threads/1')).status()).toBe(401);
});
test('P1-6: lender lists threads → 200', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const res = await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } });
  expect(res.status()).toBe(200);
  expect(Array.isArray((await res.json()).threads)).toBe(true);
});
test('P1-7: search filter — no false positives', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const res = await request.get('/api/email/threads?search=__QA_NOMATCH_XYZ__', { headers: { Authorization: `Bearer ${tok}` } });
  expect(res.status()).toBe(200);
  expect((await res.json()).threads.length).toBe(0);
});
test('P1-8: pagination limit respected', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads?limit=3', { headers: { Authorization: `Bearer ${tok}` } })).json();
  expect(threads.length).toBeLessThanOrEqual(3);
});
test('P1-9: thread detail has messages[]', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const body = await (await request.get(`/api/email/threads/${threads[0].id}`, { headers: { Authorization: `Bearer ${tok}` } })).json();
  expect(Array.isArray(body.messages)).toBe(true);
});
test('P1-10 [P0]: cross-user thread access → not 200', async ({ request }) => {
  const tok1 = await loginApi(request, LENDER.email, LENDER.password);
  const tok2 = await loginApi(request, LENDER2.email, LENDER2.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok2}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const res = await request.get(`/api/email/threads/${threads[0].id}`, { headers: { Authorization: `Bearer ${tok1}` } });
  expect(res.status()).not.toBe(200);
  expect([403, 404]).toContain(res.status());
});
