import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  validateWebhookUrl,
  generateSignature,
  deliverWebhook,
  getWebhookStats,
  deleteWebhook,
  triggerWebhookEvent,
  retryFailedDeliveries,
} from '../utils/webhooks';
import { getAvailableWebhookEvents, validateEventSubscription, getSamplePayload } from '../utils/webhookEvents';
import { requireAuth } from '../middleware/apiKeyAuth';
import { logAuditAction } from '../utils/audit';
import { db } from '../db';
import { webhooks, webhookDeliveries } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Webhook Management Routes
 *
 * Provides endpoints for:
 * - Creating and managing webhooks
 * - Subscribing to events
 * - Viewing delivery history
 * - Testing webhooks
 * - Retrying failed deliveries
 */

const router = Router();

// ============= User Webhooks (Self-Service) =============

/**
 * POST /api/webhooks
 *
 * Create a new webhook subscription
 *
 * Body:
 * {
 *   name: string (required)
 *   url: string (required, must be HTTPS)
 *   events: string[] (required, e.g., ["deals.created", "documents.signed"])
 *   rateLimitPerSecond: number (optional, default: 10)
 *   retryPolicy: object (optional)
 *   headers: object (optional, custom headers to include)
 * }
 */
router.post('/api/webhooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, url, events, rateLimitPerSecond, retryPolicy, headers } = req.body;

    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'name, url, and events (array) are required.',
      });
    }

    // Validate URL
    if (!validateWebhookUrl(url)) {
      return res.status(400).json({
        error: 'invalid_url',
        message: 'Webhook URL must be HTTPS and not point to a private IP address.',
      });
    }

    // Validate events
    const allEvents = await getAvailableWebhookEvents();
    const availableEventIds = allEvents.map((e) => e.id);

    for (const event of events) {
      // Allow wildcards like "deals.*"
      const eventPattern = event.includes('*') ? event.replace('*', '') : event;
      const isValid =
        availableEventIds.includes(event) || availableEventIds.some((e) => e.startsWith(eventPattern));

      if (!isValid) {
        return res.status(400).json({
          error: 'invalid_event',
          message: `Unknown event: ${event}. Available events: ${availableEventIds.join(', ')}`,
        });
      }

      // Check permissions for critical events
      const validation = validateEventSubscription(event, req.user?.role);
      if (!validation.valid) {
        return res.status(403).json({
          error: 'forbidden',
          message: validation.reason || 'You do not have permission to subscribe to this event.',
        });
      }
    }

    // Generate webhook secret
    const secret = bcrypt.hashSync(uuidv4(), 12);

    // Create webhook
    const webhookId = uuidv4();
    await db
      .insert(webhooks)
      .values({
        id: webhookId,
        user_id: req.user!.id,
        name,
        url,
        events,
        active: true,
        secret,
        rate_limit_per_second: rateLimitPerSecond || 10,
        retry_policy: retryPolicy || { maxRetries: 5, backoffStrategy: 'exponential' },
        headers: headers || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    // Log audit
    await logAuditAction({
      userId: req.user!.id,
      action: 'webhook.created',
      resourceType: 'webhook',
      resourceId: webhookId,
      changes: {
        name,
        url,
        events,
      },
    });

    res.status(201).json({
      id: webhookId,
      name,
      url,
      events,
      active: true,
      rateLimitPerSecond: rateLimitPerSecond || 10,
      createdAt: new Date(),
      message: 'Webhook created successfully. It is now active and will receive events.',
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to create webhook.' });
  }
});

/**
 * GET /api/webhooks
 *
 * List user's webhooks
 */
router.get('/api/webhooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const userWebhooks = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.user_id, req.user!.id))
      .execute();

    res.json({
      webhooks: userWebhooks.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        events: w.events,
        active: w.active,
        rateLimitPerSecond: w.rate_limit_per_second,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
        lastTriggeredAt: w.last_triggered_at,
        failureCount: w.failure_count,
      })),
    });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to list webhooks.' });
  }
});

/**
 * GET /api/webhooks/:id
 *
 * Get webhook details
 */
router.get('/api/webhooks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const webhook = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, req.params.id), eq(webhooks.user_id, req.user!.id)))
      .limit(1)
      .execute();

    if (webhook.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Webhook not found.',
      });
    }

    const w = webhook[0];

    res.json({
      id: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      active: w.active,
      rateLimitPerSecond: w.rate_limit_per_second,
      retryPolicy: w.retry_policy,
      headers: w.headers,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      lastTriggeredAt: w.last_triggered_at,
      failureCount: w.failure_count,
    });
  } catch (error) {
    console.error('Error getting webhook:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to get webhook.' });
  }
});

/**
 * PATCH /api/webhooks/:id
 *
 * Update webhook
 *
 * Body can include:
 * {
 *   name?: string
 *   url?: string
 *   events?: string[]
 *   active?: boolean
 *   rateLimitPerSecond?: number
 * }
 */
router.patch('/api/webhooks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, url, events, active, rateLimitPerSecond } = req.body;

    const webhook = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, req.params.id), eq(webhooks.user_id, req.user!.id)))
      .limit(1)
      .execute();

    if (webhook.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Webhook not found.',
      });
    }

    // Validate URL if provided
    if (url && !validateWebhookUrl(url)) {
      return res.status(400).json({
        error: 'invalid_url',
        message: 'Webhook URL must be HTTPS and not point to a private IP address.',
      });
    }

    // Update
    const updates: any = { updated_at: new Date() };
    if (name) updates.name = name;
    if (url) updates.url = url;
    if (events) updates.events = events;
    if (active !== undefined) updates.active = active;
    if (rateLimitPerSecond) updates.rate_limit_per_second = rateLimitPerSecond;

    await db.update(webhooks).set(updates).where(eq(webhooks.id, req.params.id)).execute();

    // Log audit
    await logAuditAction({
      userId: req.user!.id,
      action: 'webhook.updated',
      resourceType: 'webhook',
      resourceId: req.params.id,
      changes: updates,
    });

    const updated = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, req.params.id))
      .limit(1)
      .execute();

    const w = updated[0];

    res.json({
      id: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      active: w.active,
      rateLimitPerSecond: w.rate_limit_per_second,
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to update webhook.' });
  }
});

/**
 * DELETE /api/webhooks/:id
 *
 * Delete webhook
 */
router.delete('/api/webhooks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const webhook = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, req.params.id), eq(webhooks.user_id, req.user!.id)))
      .limit(1)
      .execute();

    if (webhook.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Webhook not found.',
      });
    }

    await deleteWebhook(req.params.id);

    // Log audit
    await logAuditAction({
      userId: req.user!.id,
      action: 'webhook.deleted',
      resourceType: 'webhook',
      resourceId: req.params.id,
    });

    res.json({
      message: 'Webhook deleted successfully.',
      id: req.params.id,
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to delete webhook.' });
  }
});

/**
 * POST /api/webhooks/:id/test
 *
 * Send test event to webhook
 */
router.post('/api/webhooks/:id/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const webhook = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, req.params.id), eq(webhooks.user_id, req.user!.id)))
      .limit(1)
      .execute();

    if (webhook.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Webhook not found.',
      });
    }

    const w = webhook[0];

    // Send test event
    const testPayload = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      event: 'system.health',
      data: {
        status: 'test',
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
      },
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
      {
        id: 'system.health',
        name: 'System Health',
        resourceType: 'system',
        timestamp: new Date(),
        data: testPayload.data,
      }
    );

    res.json({
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      error: result.error,
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to test webhook.' });
  }
});

/**
 * GET /api/webhooks/:id/events
 *
 * Get recent event deliveries for webhook
 */
router.get('/api/webhooks/:id/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const webhook = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, req.params.id), eq(webhooks.user_id, req.user!.id)))
      .limit(1)
      .execute();

    if (webhook.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Webhook not found.',
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhook_id, req.params.id))
      .limit(limit)
      .execute();

    res.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        eventId: d.event_id,
        succeeded: d.succeeded,
        statusCode: d.status_code,
        responseTime: d.response_time_ms,
        error: d.error_message,
        timestamp: d.timestamp,
        retriedAt: d.retried_at,
      })),
    });
  } catch (error) {
    console.error('Error getting webhook events:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to get webhook events.' });
  }
});

/**
 * POST /api/webhooks/:id/retry
 *
 * Manually retry failed deliveries for webhook
 */
router.post('/api/webhooks/:id/retry', requireAuth, async (req: Request, res: Response) => {
  try {
    const webhook = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, req.params.id), eq(webhooks.user_id, req.user!.id)))
      .limit(1)
      .execute();

    if (webhook.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Webhook not found.',
      });
    }

    // Retry failed deliveries
    await retryFailedDeliveries();

    res.json({
      message: 'Retrying failed deliveries...',
    });
  } catch (error) {
    console.error('Error retrying webhook deliveries:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to retry deliveries.' });
  }
});

// ============= Webhook Event Reference =============

/**
 * GET /api/webhooks/events
 *
 * Get all available webhook events
 */
router.get('/api/webhooks-events', async (req: Request, res: Response) => {
  try {
    const events = await getAvailableWebhookEvents();

    res.json({
      events: events.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        resourceType: e.resourceType,
        critical: e.critical || false,
        samplePayload: e.samplePayload,
      })),
    });
  } catch (error) {
    console.error('Error getting webhook events:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to get webhook events.' });
  }
});

export default router;
