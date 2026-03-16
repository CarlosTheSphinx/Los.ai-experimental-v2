import { Request, Response, NextFunction } from 'express';
import { triggerWebhookEvent } from '../utils/webhooks';
import { WebhookEvent } from '../utils/webhooks';

/**
 * Webhook Event Emitter Middleware
 *
 * Provides utilities to trigger webhook events from route handlers.
 * Automatically emits events based on resource changes.
 *
 * Usage in routes:
 *   emitWebhookEvent(req, 'deals.created', dealData);
 */

/**
 * Emit a webhook event
 *
 * Triggers all webhooks subscribed to this event
 * Runs asynchronously in background (doesn't block response)
 */
export function emitWebhookEvent(
  req: Request,
  eventId: string,
  data: any
): Promise<void> {
  const event: WebhookEvent = {
    id: eventId,
    name: eventId,
    resourceType: eventId.split('.')[0] as any,
    timestamp: new Date(),
    data,
  };

  // Trigger webhooks asynchronously (don't block response)
  return triggerWebhookEvent(event).catch((error) => {
    console.error(`Error triggering webhook event ${eventId}:`, error);
    // Silently fail - don't break the user's request
  });
}

/**
 * Middleware to capture request body for change detection
 *
 * Stores the original request body for comparison in emitWebhookEvent
 */
export function captureOriginalBody(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    (req as any).originalBody = JSON.parse(JSON.stringify(req.body));
  }
  next();
}

/**
 * Detect changes between old and new data
 *
 * Returns object showing what changed
 */
export function detectChanges(oldData: any, newData: any): Record<string, any> {
  const changes: Record<string, any> = {};

  // Check what changed
  for (const key in newData) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = {
        old: oldData[key],
        new: newData[key],
      };
    }
  }

  // Check for deletions
  for (const key in oldData) {
    if (!(key in newData)) {
      changes[key] = {
        old: oldData[key],
        new: undefined,
      };
    }
  }

  return changes;
}

/**
 * Emit event with change details
 *
 * Useful for .updated events
 */
export function emitWebhookEventWithChanges(
  req: Request,
  eventId: string,
  oldData: any,
  newData: any
): Promise<void> {
  const changes = detectChanges(oldData, newData);

  return emitWebhookEvent(req, eventId, {
    ...newData,
    changes,
  });
}

/**
 * Middleware to automatically emit deletion events
 *
 * Can be used on DELETE endpoints
 */
export function emitDeletionEvent(resourceType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store resource ID for use in route handler
    (req as any).resourceToDelete = req.params.id || req.body.id;

    // Intercept response to emit event after successful deletion
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Only emit if deletion was successful (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300 && (req as any).resourceToDelete) {
        emitWebhookEvent(req, `${resourceType}.deleted`, {
          id: (req as any).resourceToDelete,
          ...data,
        }).catch((error) => {
          console.error(`Error emitting deletion event for ${resourceType}:`, error);
        });
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware to batch webhook events
 *
 * Useful for bulk operations (create multiple deals, etc.)
 * Groups events and sends them together
 */
export function batchWebhookEvents(req: Request, res: Response, next: NextFunction) {
  (req as any).webhookBatch = [];

  // Add to batch
  (req as any).addToBatch = (eventId: string, data: any) => {
    (req as any).webhookBatch.push({ eventId, data });
  };

  // Flush batch after response
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    // Send all batched events
    if ((req as any).webhookBatch && (req as any).webhookBatch.length > 0) {
      Promise.all(
        (req as any).webhookBatch.map((event: any) =>
          emitWebhookEvent(req, event.eventId, event.data).catch((error) => {
            console.error('Error emitting batched webhook event:', error);
          })
        )
      ).catch((error) => {
        console.error('Error flushing webhook batch:', error);
      });
    }

    return originalJson(data);
  };

  next();
}

/**
 * Example usage in a route handler:
 *
 * // Create deal
 * router.post('/api/deals', async (req: Request, res: Response) => {
 *   const deal = await createDeal(req.body);
 *
 *   // Emit webhook event
 *   emitWebhookEvent(req, 'deals.created', deal);
 *
 *   res.json(deal);
 * });
 *
 * // Update deal
 * router.patch('/api/deals/:id', async (req: Request, res: Response) => {
 *   const oldDeal = await getDeal(req.params.id);
 *   const newDeal = await updateDeal(req.params.id, req.body);
 *
 *   // Emit webhook event with changes
 *   emitWebhookEventWithChanges(req, 'deals.updated', oldDeal, newDeal);
 *
 *   res.json(newDeal);
 * });
 */
