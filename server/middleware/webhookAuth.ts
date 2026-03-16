import { Request, Response, NextFunction } from 'express';
import { verifySignature } from '../utils/webhooks';

/**
 * Webhook Signature Verification Middleware
 *
 * Verifies that incoming webhook requests are legitimate by validating
 * HMAC-SHA256 signatures.
 *
 * This middleware is used BY WEBHOOK RECEIVERS to verify authenticity.
 *
 * Usage:
 *   // In your webhook receiver service
 *   app.post('/webhook', verifyWebhookSignature(webhookSecret), (req, res) => {
 *     // Process webhook
 *   });
 */

/**
 * Verify incoming webhook signature
 *
 * Validates X-Webhook-Signature header matches the payload
 *
 * Parameters:
 * - webhookSecret: The secret configured when creating the webhook
 *   (Usually the webhook ID in Lendry)
 */
export function verifyWebhookSignature(webhookSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const webhookId = req.headers['x-webhook-id'] as string;
    const eventId = req.headers['x-event-id'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    // Verify all required headers are present
    if (!signature || !webhookId || !eventId || !timestamp) {
      return res.status(401).json({
        error: 'missing_headers',
        message: 'Missing required webhook headers (signature, webhook_id, event_id, timestamp)',
      });
    }

    // Get raw body for signature verification
    const bodyStr = JSON.stringify(req.body);

    try {
      // Verify signature
      const isValid = verifySignature(bodyStr, signature, webhookSecret);

      if (!isValid) {
        return res.status(401).json({
          error: 'invalid_signature',
          message: 'Webhook signature verification failed. This webhook may not be legitimate.',
        });
      }

      // Verify timestamp (prevent replay attacks)
      // Accept webhooks within 5 minute window
      const webhookTime = new Date(timestamp).getTime();
      const currentTime = Date.now();
      const timeDifference = Math.abs(currentTime - webhookTime);
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (timeDifference > maxAge) {
        return res.status(401).json({
          error: 'timestamp_too_old',
          message: 'Webhook timestamp is too old. This may be a replay attack.',
          maxAge,
        });
      }

      // Store webhook metadata in request for logging
      (req as any).webhook = {
        id: webhookId,
        eventId,
        timestamp: new Date(timestamp),
        verified: true,
      };

      next();
    } catch (error) {
      console.error('Webhook signature verification error:', error);

      return res.status(500).json({
        error: 'verification_error',
        message: 'An error occurred while verifying the webhook signature.',
      });
    }
  };
}

/**
 * Extract webhook metadata from request
 *
 * Returns metadata about the webhook that was verified
 */
export function getWebhookMetadata(req: Request): WebhookMetadata | null {
  return (req as any).webhook || null;
}

export interface WebhookMetadata {
  id: string;
  eventId: string;
  timestamp: Date;
  verified: boolean;
}

/**
 * Middleware to ensure webhook is verified
 *
 * Use this AFTER verifyWebhookSignature
 */
export function requireVerifiedWebhook(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).webhook?.verified) {
    return res.status(401).json({
      error: 'webhook_not_verified',
      message: 'This endpoint requires a verified webhook. Use verifyWebhookSignature middleware.',
    });
  }

  next();
}

/**
 * Example webhook receiver implementation
 *
 * This is how a third-party integration would receive webhooks from Lendry:
 *
 * const express = require('express');
 * const app = express();
 *
 * app.use(express.json());
 *
 * // The secret is typically the webhook ID
 * const WEBHOOK_SECRET = 'your-webhook-id-from-lendry';
 *
 * // Verify signature on all webhook routes
 * app.post('/lendry-webhook', verifyWebhookSignature(WEBHOOK_SECRET), (req, res) => {
 *   const webhook = getWebhookMetadata(req);
 *
 *   console.log(`Received webhook: ${webhook.eventId}`);
 *   console.log('Payload:', req.body);
 *
 *   // Process the webhook based on event type
 *   switch (webhook.eventId) {
 *     case 'deals.created':
 *       handleDealCreated(req.body);
 *       break;
 *     case 'deals.updated':
 *       handleDealUpdated(req.body);
 *       break;
 *     case 'documents.signed':
 *       handleDocumentSigned(req.body);
 *       break;
 *     default:
 *       console.log(`Unknown event: ${webhook.eventId}`);
 *   }
 *
 *   // Return 2xx status to confirm delivery
 *   res.json({ received: true });
 * });
 *
 * app.listen(3000, () => {
 *   console.log('Webhook receiver listening on port 3000');
 * });
 */
