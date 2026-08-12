/**
 * Phase 3 — AI Deal Intake (4 scenarios)
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

const LENDER = { email: process.env.TEST_LENDER_EMAIL ?? 'test-lender@losai.test', password: process.env.TEST_LENDER_PASSWORD ?? 'TestPassword123!' };

test('P3-1: pin creates submission with id', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const res = await request.post(`/api/email/threads/${threads[0].id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } });
  expect(res.status()).toBe(200);
  expect(typeof (await res.json()).submissionId).toBe('number');
});
test('P3-2: pin never 500 regardless of email content', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  expect((await request.post(`/api/email/threads/${threads[0].id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } })).status()).not.toBe(500);
});
test('P3-3: re-pin returns same submissionId', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const id = threads[0].id;
  const r1 = await (await request.post(`/api/email/threads/${id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } })).json();
  const r2 = await (await request.post(`/api/email/threads/${id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } })).json();
  expect(r2.submissionId).toBe(r1.submissionId);
});
test('P3-4: pin responds within 5s (AI async)', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const { threads } = await (await request.get('/api/email/threads', { headers: { Authorization: `Bearer ${tok}` } })).json();
  if (!threads?.length) { test.skip(); return; }
  const t = Date.now();
  const res = await request.post(`/api/email/threads/${threads[0].id}/pin-to-pipeline`, { headers: { Authorization: `Bearer ${tok}` } });
  expect(res.status()).toBe(200);
  expect(Date.now() - t).toBeLessThan(5000);
});
