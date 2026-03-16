import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Week 7 Migration: Add Webhooks for Integrations
 *
 * Creates three new tables:
 * 1. webhooks - Stores webhook subscriptions
 * 2. webhook_events - Pre-defined webhook event types
 * 3. webhook_deliveries - Audit trail of webhook delivery attempts
 *
 * Features:
 * - Webhook subscription management per user
 * - Event filtering and subscription
 * - HMAC-SHA256 signing for security
 * - Retry mechanism with exponential backoff
 * - Complete audit trail of all deliveries
 */

export async function up() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(connectionString);
  const db = drizzle(sql);

  // Create webhook_events table (reference data)
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      resource_type VARCHAR(50) NOT NULL,
      sample_payload JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  // Create webhooks table
  await sql`
    CREATE TABLE IF NOT EXISTS webhooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      url VARCHAR(2048) NOT NULL,
      events TEXT[] NOT NULL DEFAULT '{}',
      active BOOLEAN NOT NULL DEFAULT true,
      secret VARCHAR(255) NOT NULL,
      rate_limit_per_second INTEGER NOT NULL DEFAULT 10,
      retry_policy JSONB NOT NULL DEFAULT '{"max_retries": 5, "backoff_strategy": "exponential"}',
      headers JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_triggered_at TIMESTAMP,
      failure_count INTEGER NOT NULL DEFAULT 0,

      CONSTRAINT valid_url CHECK (url ~ '^https?://'),
      CONSTRAINT rate_limit_positive CHECK (rate_limit_per_second > 0)
    );
  `;

  // Create indexes for webhooks
  await sql`CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events)`;

  // Create webhook_deliveries table (audit trail)
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event_id VARCHAR(100) NOT NULL REFERENCES webhook_events(id),
      payload JSONB NOT NULL,
      status_code SMALLINT,
      response_time_ms INTEGER,
      error_message TEXT,
      retried_at TIMESTAMP[],
      succeeded BOOLEAN NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

      CONSTRAINT valid_status_code CHECK (status_code IS NULL OR (status_code >= 100 AND status_code < 600))
    );
  `;

  // Create indexes for deliveries
  await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_id ON webhook_deliveries(webhook_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_event_id ON webhook_deliveries(event_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_timestamp ON webhook_deliveries(timestamp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_succeeded ON webhook_deliveries(succeeded)`;

  // Create view for webhook statistics
  await sql`
    CREATE OR REPLACE VIEW webhook_statistics AS
    SELECT
      w.id,
      w.user_id,
      w.name,
      COUNT(wd.id) as total_deliveries,
      SUM(CASE WHEN wd.succeeded = true THEN 1 ELSE 0 END) as successful_deliveries,
      SUM(CASE WHEN wd.succeeded = false THEN 1 ELSE 0 END) as failed_deliveries,
      AVG(wd.response_time_ms) as avg_response_time_ms,
      MAX(wd.timestamp) as last_delivery_at,
      w.created_at,
      w.updated_at
    FROM webhooks w
    LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
    GROUP BY w.id, w.user_id, w.name, w.created_at, w.updated_at;
  `;

  // Insert pre-defined webhook events
  const events = [
    // Deal events
    ['deals.created', 'Deal Created', 'A new deal has been created', 'deal'],
    ['deals.updated', 'Deal Updated', 'A deal has been updated', 'deal'],
    ['deals.status_changed', 'Deal Status Changed', 'Deal status has changed', 'deal'],
    ['deals.deleted', 'Deal Deleted', 'A deal has been deleted', 'deal'],

    // Document events
    ['documents.uploaded', 'Document Uploaded', 'A document has been uploaded', 'document'],
    ['documents.signed', 'Document Signed', 'A document has been e-signed', 'document'],
    ['documents.deleted', 'Document Deleted', 'A document has been deleted', 'document'],

    // Borrower events
    ['borrowers.created', 'Borrower Created', 'A new borrower has been created', 'borrower'],
    ['borrowers.updated', 'Borrower Updated', 'Borrower information has been updated', 'borrower'],
    ['borrowers.deleted', 'Borrower Deleted', 'A borrower has been deleted', 'borrower'],

    // User/Auth events
    ['users.created', 'User Created', 'A new user account has been created', 'user'],
    ['users.updated', 'User Updated', 'User information has been updated', 'user'],

    // Audit/Security events
    ['audit.pii_accessed', 'PII Accessed', 'Sensitive PII has been accessed', 'audit'],
    ['audit.api_key_revoked', 'API Key Revoked', 'An API key has been revoked', 'audit'],
    ['audit.critical_action', 'Critical Action', 'A critical action has been performed', 'audit'],

    // System events
    ['system.health', 'System Health Check', 'Periodic system health status', 'system'],
  ];

  for (const [id, name, description, resourceType] of events) {
    await sql`
      INSERT INTO webhook_events (id, name, description, resource_type)
      VALUES (${id}, ${name}, ${description}, ${resourceType})
      ON CONFLICT (id) DO NOTHING;
    `;
  }

  console.log('✓ Migration 003: Webhooks for Integrations completed');
  await sql.end();
}

export async function down() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(connectionString);

  // Drop views
  await sql`DROP VIEW IF EXISTS webhook_statistics`;

  // Drop tables (cascade handles foreign keys)
  await sql`DROP TABLE IF EXISTS webhook_deliveries CASCADE`;
  await sql`DROP TABLE IF EXISTS webhooks CASCADE`;
  await sql`DROP TABLE IF EXISTS webhook_events CASCADE`;

  console.log('✓ Migration 003 rolled back');
  await sql.end();
}
