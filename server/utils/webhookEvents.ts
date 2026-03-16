/**
 * Webhook Event Definitions
 *
 * Pre-defined webhook event types that can be subscribed to.
 * Each event includes metadata for documentation and filtering.
 */

export interface WebhookEventDefinition {
  id: string;
  name: string;
  description: string;
  resourceType: 'deal' | 'document' | 'borrower' | 'user' | 'audit' | 'system';
  critical?: boolean; // Requires special permissions
  samplePayload?: any;
}

export const WEBHOOK_EVENT_DEFINITIONS: Record<string, WebhookEventDefinition> = {
  // ============= Deal Events =============
  'deals.created': {
    id: 'deals.created',
    name: 'Deal Created',
    description: 'Triggered when a new deal is created',
    resourceType: 'deal',
    samplePayload: {
      id: 'deal_123',
      name: 'Commercial Property Loan',
      status: 'pending_review',
      loanAmount: 500000,
      borrowerId: 'borrower_456',
      createdAt: '2026-03-03T12:00:00Z',
    },
  },

  'deals.updated': {
    id: 'deals.updated',
    name: 'Deal Updated',
    description: 'Triggered when a deal is modified',
    resourceType: 'deal',
    samplePayload: {
      id: 'deal_123',
      changes: {
        loanAmount: { old: 500000, new: 550000 },
        status: { old: 'pending_review', new: 'approved' },
      },
      updatedAt: '2026-03-03T13:00:00Z',
    },
  },

  'deals.status_changed': {
    id: 'deals.status_changed',
    name: 'Deal Status Changed',
    description: 'Triggered when a deal status changes',
    resourceType: 'deal',
    samplePayload: {
      id: 'deal_123',
      previousStatus: 'pending_review',
      newStatus: 'approved',
      changedBy: 'user_789',
      changedAt: '2026-03-03T13:30:00Z',
    },
  },

  'deals.deleted': {
    id: 'deals.deleted',
    name: 'Deal Deleted',
    description: 'Triggered when a deal is deleted',
    resourceType: 'deal',
    critical: true,
    samplePayload: {
      id: 'deal_123',
      name: 'Commercial Property Loan',
      deletedBy: 'user_789',
      deletedAt: '2026-03-03T14:00:00Z',
    },
  },

  // ============= Document Events =============
  'documents.uploaded': {
    id: 'documents.uploaded',
    name: 'Document Uploaded',
    description: 'Triggered when a document is uploaded',
    resourceType: 'document',
    samplePayload: {
      id: 'doc_123',
      dealId: 'deal_456',
      fileName: 'loan-agreement.pdf',
      fileSize: 1048576,
      mimeType: 'application/pdf',
      uploadedBy: 'user_789',
      uploadedAt: '2026-03-03T15:00:00Z',
    },
  },

  'documents.signed': {
    id: 'documents.signed',
    name: 'Document Signed',
    description: 'Triggered when a document is e-signed',
    resourceType: 'document',
    samplePayload: {
      id: 'doc_123',
      dealId: 'deal_456',
      fileName: 'loan-agreement.pdf',
      signedBy: 'user_999',
      signatureUrl: 'https://...',
      signedAt: '2026-03-03T16:00:00Z',
    },
  },

  'documents.deleted': {
    id: 'documents.deleted',
    name: 'Document Deleted',
    description: 'Triggered when a document is deleted',
    resourceType: 'document',
    critical: true,
    samplePayload: {
      id: 'doc_123',
      dealId: 'deal_456',
      fileName: 'loan-agreement.pdf',
      deletedBy: 'user_789',
      deletedAt: '2026-03-03T17:00:00Z',
    },
  },

  // ============= Borrower Events =============
  'borrowers.created': {
    id: 'borrowers.created',
    name: 'Borrower Created',
    description: 'Triggered when a new borrower is created',
    resourceType: 'borrower',
    samplePayload: {
      id: 'borrower_123',
      name: 'ABC Corporation',
      email: 'contact@abccorp.com',
      createdAt: '2026-03-03T18:00:00Z',
    },
  },

  'borrowers.updated': {
    id: 'borrowers.updated',
    name: 'Borrower Updated',
    description: 'Triggered when borrower information is updated',
    resourceType: 'borrower',
    samplePayload: {
      id: 'borrower_123',
      changes: {
        email: { old: 'old@abccorp.com', new: 'contact@abccorp.com' },
        status: { old: 'draft', new: 'active' },
      },
      updatedAt: '2026-03-03T19:00:00Z',
    },
  },

  'borrowers.deleted': {
    id: 'borrowers.deleted',
    name: 'Borrower Deleted',
    description: 'Triggered when a borrower is deleted',
    resourceType: 'borrower',
    critical: true,
    samplePayload: {
      id: 'borrower_123',
      name: 'ABC Corporation',
      deletedBy: 'user_789',
      deletedAt: '2026-03-03T20:00:00Z',
    },
  },

  // ============= User Events =============
  'users.created': {
    id: 'users.created',
    name: 'User Created',
    description: 'Triggered when a new user account is created',
    resourceType: 'user',
    samplePayload: {
      id: 'user_123',
      email: 'john@example.com',
      role: 'analyst',
      createdAt: '2026-03-03T21:00:00Z',
    },
  },

  'users.updated': {
    id: 'users.updated',
    name: 'User Updated',
    description: 'Triggered when user information is updated',
    resourceType: 'user',
    samplePayload: {
      id: 'user_123',
      changes: {
        role: { old: 'analyst', new: 'manager' },
        status: { old: 'active', new: 'inactive' },
      },
      updatedAt: '2026-03-03T22:00:00Z',
    },
  },

  // ============= Audit/Security Events =============
  'audit.pii_accessed': {
    id: 'audit.pii_accessed',
    name: 'PII Accessed',
    description: 'Triggered when sensitive PII is accessed',
    resourceType: 'audit',
    critical: true,
    samplePayload: {
      accessedBy: 'user_123',
      resourceType: 'borrower',
      resourceId: 'borrower_456',
      piiFields: ['ssn', 'id_number', 'date_of_birth'],
      accessedAt: '2026-03-03T23:00:00Z',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    },
  },

  'audit.api_key_revoked': {
    id: 'audit.api_key_revoked',
    name: 'API Key Revoked',
    description: 'Triggered when an API key is revoked',
    resourceType: 'audit',
    critical: true,
    samplePayload: {
      apiKeyId: 'key_123',
      revokedBy: 'user_456',
      reason: 'Suspected compromise',
      revokedAt: '2026-03-04T00:00:00Z',
    },
  },

  'audit.critical_action': {
    id: 'audit.critical_action',
    name: 'Critical Action',
    description: 'Triggered when a critical action is performed',
    resourceType: 'audit',
    critical: true,
    samplePayload: {
      actionType: 'bulk_delete',
      resourceType: 'deal',
      count: 5,
      performedBy: 'user_789',
      performedAt: '2026-03-04T01:00:00Z',
    },
  },

  // ============= System Events =============
  'system.health': {
    id: 'system.health',
    name: 'System Health Check',
    description: 'Periodic system health status (sent hourly)',
    resourceType: 'system',
    samplePayload: {
      status: 'healthy',
      timestamp: '2026-03-04T02:00:00Z',
      metrics: {
        uptime: 8640000,
        activeConnections: 45,
        queuedJobs: 2,
        databaseLatency: 12,
      },
    },
  },
};

/**
 * Get all available webhook events
 */
export function getAvailableWebhookEvents(): WebhookEventDefinition[] {
  return Object.values(WEBHOOK_EVENT_DEFINITIONS);
}

/**
 * Get webhook event definition by ID
 */
export function getWebhookEventDefinition(eventId: string): WebhookEventDefinition | undefined {
  return WEBHOOK_EVENT_DEFINITIONS[eventId];
}

/**
 * Check if event is critical (requires audit logging)
 */
export function isCriticalEvent(eventId: string): boolean {
  const def = WEBHOOK_EVENT_DEFINITIONS[eventId];
  return def?.critical === true;
}

/**
 * Get events by resource type
 */
export function getEventsByResourceType(resourceType: string): WebhookEventDefinition[] {
  return Object.values(WEBHOOK_EVENT_DEFINITIONS).filter((e) => e.resourceType === resourceType);
}

/**
 * Get all critical events
 */
export function getCriticalEvents(): WebhookEventDefinition[] {
  return Object.values(WEBHOOK_EVENT_DEFINITIONS).filter((e) => e.critical === true);
}

/**
 * Validate event subscription
 *
 * Checks if event ID is valid and checks if user has permission
 * (critical events may require special permissions)
 */
export function validateEventSubscription(eventId: string, userRole?: string): { valid: boolean; reason?: string } {
  const def = WEBHOOK_EVENT_DEFINITIONS[eventId];

  if (!def) {
    return {
      valid: false,
      reason: `Unknown event: ${eventId}`,
    };
  }

  // Critical events might require admin role
  if (def.critical && userRole && userRole !== 'super_admin' && userRole !== 'admin') {
    return {
      valid: false,
      reason: 'Critical events require admin role',
    };
  }

  return { valid: true };
}

/**
 * Get sample payload for testing
 */
export function getSamplePayload(eventId: string): any {
  const def = WEBHOOK_EVENT_DEFINITIONS[eventId];
  return def?.samplePayload || {};
}
