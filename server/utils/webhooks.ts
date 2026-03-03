import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { db } from '../db';
import { webhooks, webhookDeliveries, webhookEvents } from '../db/schema';
import { eq, and, isNull, gt, lte } from 'drizzle-orm';

/**
 * Webhook Management Utilities
 *
 * Handles:
 * - Webhook CRUD operations
 * - Event triggering and filtering
 * - Delivery with retry logic
 * - Signature generation for security
 * - Audit trail management
 */

export interface Webhook {
  id: string;
  userId: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  rateLimitPerSecond: number;
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
  };
  headers?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

export interface WebhookEvent {
  id: string;
  name: string;
  resourceType: 'deal' | 'document' | 'borrower' | 'user' | 'audit' | 'system';
  timestamp: Date;
  data: any;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  retriedAt?: Date[];
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 *
 * Signature is sent as X-Webhook-Signature header
 * Allows webhook receivers to verify authenticity
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature
 *
 * Returns true if signature matches payload
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Calculate exponential backoff delay
 *
 * Retry delays: 1s, 2s, 4s, 8s, 16s, 32s...
 */
export function calculateBackoff(retryCount: number, strategy: 'exponential' | 'linear' = 'exponential'): number {
  if (strategy === 'exponential') {
    return Math.min(Math.pow(2, retryCount) * 1000, 60 * 1000); // Max 60 seconds
  } else {
    return Math.min((retryCount + 1) * 1000, 60 * 1000); // Linear: 1s, 2s, 3s...
  }
}

/**
 * Validate webhook URL
 *
 * Prevents:
 * - Internal IP ranges (127.0.0.1, 192.168.*, 10.*, etc.)
 * - Non-HTTPS endpoints (should be HTTPS in production)
 */
export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Must be HTTPS or localhost for testing
    if (parsed.protocol !== 'https:' && !parsed.hostname.includes('localhost')) {
      return false;
    }

    // Block private IP ranges
    const hostname = parsed.hostname;
    const blocked = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^::1$/, // IPv6 loopback
      /^fe80:/, // IPv6 link-local
      /^fc00:/, // IPv6 unique local
    ];

    for (const pattern of blocked) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Deliver webhook event with retry logic
 *
 * Features:
 * - HTTP timeout: 10 seconds
 * - Exponential backoff on failure
 * - Max 5 retries
 * - HMAC signature verification
 * - Full audit trail
 */
export async function deliverWebhook(webhook: Webhook, event: WebhookEvent): Promise<DeliveryResult> {
  const payload = JSON.stringify({
    id: crypto.randomUUID(),
    timestamp: event.timestamp.toISOString(),
    event: event.id,
    data: event.data,
  });

  const signature = generateSignature(payload, webhook.id); // Use webhook ID as secret

  const maxRetries = webhook.retryPolicy.maxRetries || 5;
  let lastError: string | undefined;
  let lastStatusCode: number | undefined;
  let responseTime = 0;
  const retriedAt: Date[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Id': webhook.id,
          'X-Event-Id': event.id,
          'X-Timestamp': event.timestamp.toISOString(),
          ...(webhook.headers || {}),
        },
        timeout: 10000, // 10 second timeout
      });

      responseTime = Date.now() - startTime;

      // Success: 2xx status code
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          statusCode: response.status,
          responseTime,
          retriedAt: retriedAt.length > 0 ? retriedAt : undefined,
        };
      }

      // Non-2xx response, retry
      lastStatusCode = response.status;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      responseTime = Date.now() - (Date.now() - responseTime);

      if (axios.isAxiosError(error)) {
        lastStatusCode = error.response?.status;
        lastError = error.message || 'Unknown error';
      } else {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Don't retry on last attempt
    if (attempt < maxRetries) {
      const delay = calculateBackoff(attempt, webhook.retryPolicy.backoffStrategy);
      await new Promise((resolve) => setTimeout(resolve, delay));
      retriedAt.push(new Date());
    }
  }

  return {
    success: false,
    statusCode: lastStatusCode,
    responseTime,
    error: lastError,
    retriedAt: retriedAt.length > 0 ? retriedAt : undefined,
  };
}

/**
 * Log webhook delivery to audit trail
 */
export async function logDelivery(
  webhookId: string,
  eventId: string,
  payload: string,
  result: DeliveryResult
): Promise<void> {
  await db
    .insert(webhookDeliveries)
    .values({
      id: crypto.randomUUID(),
      webhook_id: webhookId,
      event_id: eventId,
      payload: JSON.parse(payload),
      status_code: result.statusCode || null,
      response_time_ms: result.responseTime,
      error_message: result.error,
      retried_at: result.retriedAt,
      succeeded: result.success,
      timestamp: new Date(),
    })
    .execute();
}

/**
 * Trigger webhook event
 *
 * 1. Find all active webhooks subscribed to this event
 * 2. Deliver to each webhook
 * 3. Log results
 */
export async function triggerWebhookEvent(event: WebhookEvent): Promise<void> {
  // Find active webhooks subscribed to this event
  const allWebhooks = await db.select().from(webhooks).where(eq(webhooks.active, true)).execute();

  const subscribedWebhooks = allWebhooks.filter((w) =>
    w.events.includes(event.id) || w.events.includes(`${event.id.split('.')[0]}.*`)
  );

  // Deliver to each webhook
  for (const webhook of subscribedWebhooks) {
    try {
      const result = await deliverWebhook(
        {
          id: webhook.id,
          userId: webhook.user_id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          active: webhook.active,
          rateLimitPerSecond: webhook.rate_limit_per_second,
          retryPolicy: webhook.retry_policy as any,
          headers: webhook.headers,
          createdAt: webhook.created_at,
          updatedAt: webhook.updated_at,
          lastTriggeredAt: webhook.last_triggered_at || undefined,
          failureCount: webhook.failure_count,
        },
        event
      );

      // Log delivery
      await logDelivery(
        webhook.id,
        event.id,
        JSON.stringify({
          timestamp: event.timestamp.toISOString(),
          event: event.id,
          data: event.data,
        }),
        result
      );

      // Update webhook last_triggered_at
      await db
        .update(webhooks)
        .set({
          last_triggered_at: new Date(),
          failure_count: result.success ? 0 : webhook.failure_count + 1,
          updated_at: new Date(),
        })
        .where(eq(webhooks.id, webhook.id))
        .execute();
    } catch (error) {
      console.error(`Error delivering webhook ${webhook.id}:`, error);
    }
  }
}

/**
 * Retry failed webhook deliveries
 *
 * Finds deliveries that failed and retries them
 * Only retries if not all retries have been exhausted
 */
export async function retryFailedDeliveries(): Promise<void> {
  // Get failed deliveries from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const failedDeliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(and(eq(webhookDeliveries.succeeded, false), gt(webhookDeliveries.timestamp, oneHourAgo)))
    .execute();

  for (const delivery of failedDeliveries) {
    try {
      const webhook = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, delivery.webhook_id))
        .limit(1)
        .execute();

      if (webhook.length === 0) continue;

      const w = webhook[0];
      const retryCount = delivery.retried_at?.length || 0;
      const maxRetries = (w.retry_policy as any).maxRetries || 5;

      if (retryCount >= maxRetries) {
        continue; // Already exhausted retries
      }

      // Retry delivery
      const event: WebhookEvent = {
        id: delivery.event_id,
        name: delivery.event_id,
        resourceType: 'system',
        timestamp: delivery.timestamp,
        data: delivery.payload,
      };

      const result = await deliverWebhook(
        {
          id: w.id,
          userId: w.user_id,
          name: w.name,
          url: w.url,
          events: w.events,
          active: w.active,
          rateLimitPerSecond: w.rate_limit_per_second,
          retryPolicy: w.retry_policy as any,
          headers: w.headers,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
          lastTriggeredAt: w.last_triggered_at || undefined,
          failureCount: w.failure_count,
        },
        event
      );

      // Update delivery record if successful
      if (result.success) {
        await db
          .update(webhookDeliveries)
          .set({
            succeeded: true,
            status_code: result.statusCode || null,
            response_time_ms: result.responseTime,
            retried_at: delivery.retried_at ? [...delivery.retried_at, new Date()] : [new Date()],
          })
          .where(eq(webhookDeliveries.id, delivery.id))
          .execute();
      }
    } catch (error) {
      console.error('Error retrying failed delivery:', error);
    }
  }
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(
  webhookId: string,
  timeframeMinutes: number = 1440 // Default 24 hours
): Promise<{
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageResponseTimeMs: number;
}> {
  const startTime = new Date(Date.now() - timeframeMinutes * 60 * 1000);

  const deliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(and(eq(webhookDeliveries.webhook_id, webhookId), gt(webhookDeliveries.timestamp, startTime)))
    .execute();

  const successful = deliveries.filter((d) => d.succeeded).length;
  const failed = deliveries.filter((d) => !d.succeeded).length;
  const totalResponseTime = deliveries.reduce((sum, d) => sum + (d.response_time_ms || 0), 0);

  return {
    totalDeliveries: deliveries.length,
    successfulDeliveries: successful,
    failedDeliveries: failed,
    successRate: deliveries.length > 0 ? (successful / deliveries.length) * 100 : 0,
    averageResponseTimeMs: deliveries.length > 0 ? totalResponseTime / deliveries.length : 0,
  };
}

/**
 * Delete webhook and all associated deliveries
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  await db.delete(webhooks).where(eq(webhooks.id, webhookId)).execute();
}

/**
 * Get all available webhook events
 */
export async function getAvailableEvents() {
  return db.select().from(webhookEvents).execute();
}
