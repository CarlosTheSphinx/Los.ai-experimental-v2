import {
  generateSignature,
  verifySignature,
  validateWebhookUrl,
  calculateBackoff,
} from '../webhooks';
import { getAvailableWebhookEvents, isCriticalEvent, validateEventSubscription } from '../webhookEvents';

/**
 * Webhook Utilities Tests
 *
 * Tests cover:
 * - Signature generation and verification
 * - URL validation
 * - Backoff calculation
 * - Event validation
 */

describe('Webhook Signature', () => {
  describe('generateSignature', () => {
    test('generates consistent HMAC signatures', () => {
      const payload = 'test payload';
      const secret = 'test-secret';

      const sig1 = generateSignature(payload, secret);
      const sig2 = generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex is 64 chars
    });

    test('different payloads produce different signatures', () => {
      const secret = 'test-secret';

      const sig1 = generateSignature('payload1', secret);
      const sig2 = generateSignature('payload2', secret);

      expect(sig1).not.toBe(sig2);
    });

    test('different secrets produce different signatures', () => {
      const payload = 'test payload';

      const sig1 = generateSignature(payload, 'secret1');
      const sig2 = generateSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    test('verifies valid signature', () => {
      const payload = 'test payload';
      const secret = 'test-secret';

      const signature = generateSignature(payload, secret);
      const isValid = verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    test('rejects invalid signature', () => {
      const payload = 'test payload';
      const secret = 'test-secret';
      const wrongSignature = 'invalid-signature-here';

      const isValid = verifySignature(payload, wrongSignature, secret);

      expect(isValid).toBe(false);
    });

    test('rejects altered payload', () => {
      const payload = 'test payload';
      const secret = 'test-secret';

      const signature = generateSignature(payload, secret);
      const alteredPayload = 'altered payload';

      const isValid = verifySignature(alteredPayload, signature, secret);

      expect(isValid).toBe(false);
    });

    test('rejects wrong secret', () => {
      const payload = 'test payload';
      const secret = 'test-secret';
      const wrongSecret = 'wrong-secret';

      const signature = generateSignature(payload, secret);
      const isValid = verifySignature(payload, signature, wrongSecret);

      expect(isValid).toBe(false);
    });

    test('is timing-safe against brute force', () => {
      const payload = 'test payload';
      const secret = 'test-secret';
      const validSignature = generateSignature(payload, secret);
      const wrongSignature = validSignature.slice(0, -1) + 'X';

      // This should take roughly the same time even with wrong signature
      const start = performance.now();
      verifySignature(payload, validSignature, secret);
      const validTime = performance.now() - start;

      const start2 = performance.now();
      verifySignature(payload, wrongSignature, secret);
      const invalidTime = performance.now() - start2;

      // Timing should be similar (within 50% variance due to system jitter)
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(Math.max(validTime, invalidTime) * 0.5);
    });
  });
});

describe('URL Validation', () => {
  describe('validateWebhookUrl', () => {
    test('accepts valid HTTPS URLs', () => {
      expect(validateWebhookUrl('https://api.example.com/webhook')).toBe(true);
      expect(validateWebhookUrl('https://webhook.service.io/v1/events')).toBe(true);
    });

    test('rejects HTTP URLs', () => {
      expect(validateWebhookUrl('http://api.example.com/webhook')).toBe(false);
    });

    test('allows localhost for testing', () => {
      expect(validateWebhookUrl('https://localhost:8000/webhook')).toBe(true);
    });

    test('rejects private IP ranges', () => {
      // 127.0.0.1 (loopback when not localhost)
      expect(validateWebhookUrl('https://127.0.0.1/webhook')).toBe(false);

      // 192.168.* (private network)
      expect(validateWebhookUrl('https://192.168.1.1/webhook')).toBe(false);

      // 10.* (private network)
      expect(validateWebhookUrl('https://10.0.0.1/webhook')).toBe(false);

      // 172.16-31.* (private network)
      expect(validateWebhookUrl('https://172.16.0.1/webhook')).toBe(false);
      expect(validateWebhookUrl('https://172.31.255.255/webhook')).toBe(false);
    });

    test('rejects invalid URLs', () => {
      expect(validateWebhookUrl('not-a-url')).toBe(false);
      expect(validateWebhookUrl('')).toBe(false);
      expect(validateWebhookUrl('ftp://example.com/webhook')).toBe(false);
    });

    test('rejects IPv6 special addresses', () => {
      expect(validateWebhookUrl('https://[::1]/webhook')).toBe(false); // Loopback
      expect(validateWebhookUrl('https://[fe80::1]/webhook')).toBe(false); // Link-local
      expect(validateWebhookUrl('https://[fc00::1]/webhook')).toBe(false); // Unique local
    });
  });
});

describe('Backoff Calculation', () => {
  describe('calculateBackoff', () => {
    test('exponential backoff increases exponentially', () => {
      const backoff0 = calculateBackoff(0, 'exponential');
      const backoff1 = calculateBackoff(1, 'exponential');
      const backoff2 = calculateBackoff(2, 'exponential');
      const backoff3 = calculateBackoff(3, 'exponential');

      expect(backoff0).toBe(1000); // 2^0 = 1 second
      expect(backoff1).toBe(2000); // 2^1 = 2 seconds
      expect(backoff2).toBe(4000); // 2^2 = 4 seconds
      expect(backoff3).toBe(8000); // 2^3 = 8 seconds
    });

    test('exponential backoff has max cap', () => {
      const backoff10 = calculateBackoff(10, 'exponential');
      const maxBackoff = 60 * 1000; // 60 seconds

      expect(backoff10).toBeLessThanOrEqual(maxBackoff);
      expect(backoff10).toBe(maxBackoff);
    });

    test('linear backoff increases linearly', () => {
      const backoff0 = calculateBackoff(0, 'linear');
      const backoff1 = calculateBackoff(1, 'linear');
      const backoff2 = calculateBackoff(2, 'linear');

      expect(backoff0).toBe(1000); // 1 second
      expect(backoff1).toBe(2000); // 2 seconds
      expect(backoff2).toBe(3000); // 3 seconds
    });

    test('linear backoff has max cap', () => {
      const backoff100 = calculateBackoff(100, 'linear');
      const maxBackoff = 60 * 1000; // 60 seconds

      expect(backoff100).toBeLessThanOrEqual(maxBackoff);
      expect(backoff100).toBe(maxBackoff);
    });
  });
});

describe('Webhook Events', () => {
  describe('Event Registry', () => {
    test('has events available', () => {
      const events = getAvailableWebhookEvents();

      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeGreaterThanOrEqual(15); // At least 15 events
    });

    test('includes deal events', () => {
      const events = getAvailableWebhookEvents();
      const dealEventIds = events.filter((e) => e.resourceType === 'deal').map((e) => e.id);

      expect(dealEventIds).toContain('deals.created');
      expect(dealEventIds).toContain('deals.updated');
      expect(dealEventIds).toContain('deals.status_changed');
    });

    test('includes document events', () => {
      const events = getAvailableWebhookEvents();
      const docEventIds = events.filter((e) => e.resourceType === 'document').map((e) => e.id);

      expect(docEventIds).toContain('documents.uploaded');
      expect(docEventIds).toContain('documents.signed');
    });

    test('includes audit events', () => {
      const events = getAvailableWebhookEvents();
      const auditEventIds = events.filter((e) => e.resourceType === 'audit').map((e) => e.id);

      expect(auditEventIds.length).toBeGreaterThan(0);
      expect(auditEventIds).toContain('audit.pii_accessed');
      expect(auditEventIds).toContain('audit.api_key_revoked');
    });
  });

  describe('isCriticalEvent', () => {
    test('identifies critical events', () => {
      expect(isCriticalEvent('deals.deleted')).toBe(true);
      expect(isCriticalEvent('documents.signed')).toBe(true);
      expect(isCriticalEvent('audit.pii_accessed')).toBe(true);
    });

    test('identifies non-critical events', () => {
      expect(isCriticalEvent('deals.created')).toBe(false);
      expect(isCriticalEvent('deals.updated')).toBe(false);
      expect(isCriticalEvent('documents.uploaded')).toBe(false);
    });
  });

  describe('validateEventSubscription', () => {
    test('validates known events', () => {
      const result = validateEventSubscription('deals.created');

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('rejects unknown events', () => {
      const result = validateEventSubscription('invalid.event');

      expect(result.valid).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    test('restricts critical events to admins', () => {
      const adminResult = validateEventSubscription('audit.pii_accessed', 'super_admin');
      expect(adminResult.valid).toBe(true);

      const userResult = validateEventSubscription('audit.pii_accessed', 'user');
      expect(userResult.valid).toBe(false);
      expect(userResult.reason).toContain('admin');
    });

    test('allows non-critical events for all users', () => {
      const userResult = validateEventSubscription('deals.created', 'user');

      expect(userResult.valid).toBe(true);
    });
  });
});

describe('Real-world Scenarios', () => {
  test('webhook event flow: create -> sign -> verify', () => {
    const payload = JSON.stringify({
      id: 'event-123',
      event: 'deals.created',
      data: { dealId: 'deal-456' },
    });

    const webhookSecret = 'webhook-secret-key';

    // Step 1: Create signature (Lendry side)
    const signature = generateSignature(payload, webhookSecret);

    // Step 2: Send webhook to receiver (over HTTPS)
    // ...

    // Step 3: Receiver verifies signature
    const isValid = verifySignature(payload, signature, webhookSecret);

    expect(isValid).toBe(true);

    // Step 4: Receiver processes webhook
    // ...
  });

  test('retry strategy: exponential backoff', () => {
    const retries = [];
    for (let i = 0; i < 5; i++) {
      retries.push(calculateBackoff(i, 'exponential'));
    }

    // Total wait time with 5 retries
    const totalWait = retries.reduce((a, b) => a + b, 0);

    expect(totalWait).toBe(31000); // 1+2+4+8+16 seconds
    expect(retries).toEqual([1000, 2000, 4000, 8000, 16000]);
  });

  test('security: signature prevents tampering', () => {
    const payload = JSON.stringify({
      event: 'deals.created',
      data: { loanAmount: 500000 },
    });

    const secret = 'my-webhook-secret';
    const validSignature = generateSignature(payload, secret);

    // Attacker tries to tamper with payload
    const tamperedPayload = JSON.stringify({
      event: 'deals.created',
      data: { loanAmount: 5000000 }, // Multiplied by 10!
    });

    // Tampering is detected
    const isTampered = !verifySignature(tamperedPayload, validSignature, secret);

    expect(isTampered).toBe(true);
  });

  test('URL security: prevents SSRF attacks', () => {
    // Attacker tries to point webhook at internal service
    const internalUrls = [
      'https://192.168.1.1/admin',
      'https://10.0.0.1:8080/internal',
      'https://localhost:5000/debug',
      'https://127.0.0.1:3000/private',
    ];

    for (const url of internalUrls) {
      const isValid = validateWebhookUrl(url);
      expect(isValid).toBe(url.includes('localhost') && url.includes('https://'));
    }
  });
});

describe('Performance', () => {
  test('signature generation is fast', () => {
    const payload = 'test payload'.repeat(100); // 1.1KB

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      generateSignature(payload, `secret-${i}`);
    }
    const duration = performance.now() - start;

    // 1000 signatures should complete in < 100ms
    expect(duration).toBeLessThan(100);
  });

  test('signature verification is fast', () => {
    const payload = 'test payload'.repeat(100);
    const secret = 'my-secret';
    const signature = generateSignature(payload, secret);

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      verifySignature(payload, signature, secret);
    }
    const duration = performance.now() - start;

    // 1000 verifications should complete in < 100ms
    expect(duration).toBeLessThan(100);
  });

  test('URL validation is fast', () => {
    const urls = [
      'https://api.example.com/webhook',
      'https://webhook.service.io/v1/events',
      'https://localhost:8000/webhook',
      'https://192.168.1.1/webhook',
    ];

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      validateWebhookUrl(urls[i % urls.length]);
    }
    const duration = performance.now() - start;

    // 10000 validations should complete in < 50ms
    expect(duration).toBeLessThan(50);
  });
});
