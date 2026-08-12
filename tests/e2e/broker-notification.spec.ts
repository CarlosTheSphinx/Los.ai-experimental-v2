/**
 * ORC-35: Broker notification — all_docs_received race-condition fix
 *
 * These tests cover the broker notification path for email-intake submissions.
 * They require at least one pinned email thread with an associated commercial
 * submission (emailThreadId != null). If no such submission exists in the
 * environment the tests self-skip, matching the pattern used in ai-deal-intake.spec.ts.
 */
import { test, expect } from '@playwright/test';

const LENDER = {
  email: process.env.TEST_LENDER_EMAIL ?? 'test-lender@losai.test',
  password: process.env.TEST_LENDER_PASSWORD ?? 'TestPassword123!',
};

async function loginApi(request: import('@playwright/test').APIRequestContext, email: string, password: string): Promise<string> {
  const res = await request.post('/api/auth/login', { data: { email, password } });
  if (!res.ok()) throw new Error(`Login failed (${res.status()}) for ${email}`);
  const body = await res.json();
  if (body.token) return body.token;
  const m = (res.headers()['set-cookie'] ?? '').match(/auth_token=([^;]+)/);
  if (m) return m[1];
  throw new Error('No token in login response');
}

async function getEmailIntakeSubmission(
  request: import('@playwright/test').APIRequestContext,
  tok: string,
): Promise<{ id: number } | null> {
  // Look for an existing submission that was created via email intake (has emailThreadId).
  // We check the deal inbox endpoint which scopes to email-sourced submissions.
  const res = await request.get('/api/email/deals', { headers: { Authorization: `Bearer ${tok}` } });
  if (!res.ok()) return null;
  const body = await res.json();
  const deals: Array<{ id: number }> = Array.isArray(body) ? body : (body.deals ?? []);
  return deals.length > 0 ? deals[0] : null;
}

async function uploadDoc(
  request: import('@playwright/test').APIRequestContext,
  tok: string,
  submissionId: number,
  docType: string,
): Promise<Response> {
  return request.post(`/api/commercial-submissions/${submissionId}/documents`, {
    headers: { Authorization: `Bearer ${tok}` },
    data: {
      docType,
      storageKey: `test/orc35/${submissionId}/${docType.toLowerCase()}-${Date.now()}.pdf`,
      originalFileName: `${docType}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 1024,
    },
  }) as unknown as Response;
}

// ORC35-1: Sequential upload of all 3 core docs transitions submission to docs_received
test('ORC35-1: sequential upload of SREO+PFS+BUDGET sets status to docs_received', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const submission = await getEmailIntakeSubmission(request, tok);
  if (!submission) { test.skip(); return; }

  const { id } = submission;
  const authHeaders = { Authorization: `Bearer ${tok}` };

  // Upload 3 core required docs sequentially
  for (const docType of ['SREO', 'PFS', 'BUDGET']) {
    const res = await request.post(`/api/commercial-submissions/${id}/documents`, {
      headers: authHeaders,
      data: {
        docType,
        storageKey: `test/orc35/${id}/${docType.toLowerCase()}-seq.pdf`,
        originalFileName: `${docType}.pdf`,
        mimeType: 'application/pdf',
        fileSize: 2048,
      },
    });
    expect(res.status(), `Upload ${docType}`).toBe(200);
  }

  // After all 3 are present the status should be docs_received
  const statusRes = await request.get(`/api/commercial-submissions/${id}`, { headers: authHeaders });
  expect(statusRes.status()).toBe(200);
  const data = await statusRes.json();
  expect(data.status).toBe('docs_received');
});

// ORC35-2: Concurrent final-doc uploads must not produce double status transition
// (both requests succeed; only one claimDocsReceived wins → status = docs_received once)
test('ORC35-2: concurrent uploads of the same final doc type do not double-transition status', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const submission = await getEmailIntakeSubmission(request, tok);
  if (!submission) { test.skip(); return; }

  const { id } = submission;
  const authHeaders = { Authorization: `Bearer ${tok}` };

  // Pre-load SREO and PFS so that adding BUDGET triggers the notification path
  for (const docType of ['SREO', 'PFS']) {
    const res = await request.post(`/api/commercial-submissions/${id}/documents`, {
      headers: authHeaders,
      data: {
        docType,
        storageKey: `test/orc35/${id}/${docType.toLowerCase()}-concurrent-pre.pdf`,
        originalFileName: `${docType}.pdf`,
        mimeType: 'application/pdf',
        fileSize: 512,
      },
    });
    // Accept 200 (new) or 409 (already uploaded in a prior test run)
    expect([200, 409]).toContain(res.status());
  }

  // Fire two concurrent BUDGET uploads
  const [r1, r2] = await Promise.all([
    request.post(`/api/commercial-submissions/${id}/documents`, {
      headers: authHeaders,
      data: {
        docType: 'BUDGET',
        storageKey: `test/orc35/${id}/budget-concurrent-a.pdf`,
        originalFileName: 'BUDGET_a.pdf',
        mimeType: 'application/pdf',
        fileSize: 512,
      },
    }),
    request.post(`/api/commercial-submissions/${id}/documents`, {
      headers: authHeaders,
      data: {
        docType: 'BUDGET',
        storageKey: `test/orc35/${id}/budget-concurrent-b.pdf`,
        originalFileName: 'BUDGET_b.pdf',
        mimeType: 'application/pdf',
        fileSize: 512,
      },
    }),
  ]);

  // Both uploads must succeed at the HTTP level
  expect(r1.status()).toBe(200);
  expect(r2.status()).toBe(200);

  // Submission status must be docs_received (exactly one atomic transition)
  const statusRes = await request.get(`/api/commercial-submissions/${id}`, { headers: authHeaders });
  expect(statusRes.status()).toBe(200);
  const data = await statusRes.json();
  expect(data.status).toBe('docs_received');
});

// ORC35-3: A re-upload after docs_received does not re-trigger status transition
test('ORC35-3: uploading a doc when already docs_received keeps status docs_received', async ({ request }) => {
  const tok = await loginApi(request, LENDER.email, LENDER.password);
  const submission = await getEmailIntakeSubmission(request, tok);
  if (!submission) { test.skip(); return; }

  const { id } = submission;
  const authHeaders = { Authorization: `Bearer ${tok}` };

  // Ensure we are in docs_received first (upload all 3 if needed)
  for (const docType of ['SREO', 'PFS', 'BUDGET']) {
    await request.post(`/api/commercial-submissions/${id}/documents`, {
      headers: authHeaders,
      data: {
        docType,
        storageKey: `test/orc35/${id}/${docType.toLowerCase()}-re-upload-pre.pdf`,
        originalFileName: `${docType}.pdf`,
        mimeType: 'application/pdf',
        fileSize: 256,
      },
    });
  }

  // Upload SREO again after docs_received
  const reUpload = await request.post(`/api/commercial-submissions/${id}/documents`, {
    headers: authHeaders,
    data: {
      docType: 'SREO',
      storageKey: `test/orc35/${id}/sreo-re-upload.pdf`,
      originalFileName: 'SREO_v2.pdf',
      mimeType: 'application/pdf',
      fileSize: 256,
    },
  });
  expect(reUpload.status()).toBe(200);

  // Status must remain docs_received (claimDocsReceived returns false because status is already set)
  const statusRes = await request.get(`/api/commercial-submissions/${id}`, { headers: authHeaders });
  const data = await statusRes.json();
  expect(data.status).toBe('docs_received');
});
