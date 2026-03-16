import type { Request } from 'express';
import { auditLogs } from '@shared/schema';

/**
 * Week 3: Comprehensive Audit Logging for SOC 2 Compliance
 * Central utility for immutable, append-only audit trail logging
 */

/**
 * Extract client IP address from request, handling proxy headers
 * Supports X-Forwarded-For and direct connection IPs
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return (req.ip || req.socket.remoteAddress || 'unknown').toString();
}

/**
 * Core parameters for audit logging
 * All fields are optional except action and success for flexibility
 */
export interface AuditLogParams {
  userId?: number | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string; // e.g., 'user.created', 'deal.updated', 'document.downloaded'
  resourceType?: string; // e.g., 'user', 'deal', 'document'
  resourceId?: string; // The specific resource being acted upon
  oldValues?: Record<string, any> | null; // Previous state for updates
  newValues?: Record<string, any> | null; // New state for updates/creates
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Create an audit log entry - the main logging function
 * Gracefully handles failures to prevent breaking requests
 *
 * @param db Drizzle database instance
 * @param params Audit log parameters
 */
export async function createAuditLog(db: any, params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      userEmail: params.userEmail ?? null,
      userRole: params.userRole ?? null,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
      newValues: params.newValues ? JSON.stringify(params.newValues) : null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      statusCode: params.statusCode ?? null,
      success: params.success,
      errorMessage: params.errorMessage ?? null,
    });
  } catch (error) {
    // Gracefully handle audit log failures - don't break the main request
    console.error('Audit log write failed:', error);
    // In production, could send to error tracking service (Sentry, etc.)
  }
}

/**
 * Extract user authentication context from request
 * Returns null values gracefully if user not authenticated
 *
 * @param req Express request with user object
 */
export function getAuthContext(req: any): {
  userId?: number | null;
  userEmail?: string | null;
  userRole?: string | null;
} {
  return {
    userId: req.user?.id ?? null,
    userEmail: req.user?.email ?? null,
    userRole: req.user?.role ?? null,
  };
}

/**
 * Convenience function for logging user actions with auto-populated context
 * Reduces boilerplate when user info is available
 *
 * @param db Database instance
 * @param req Express request
 * @param action Action being performed
 * @param resourceType Type of resource
 * @param resourceId ID of resource
 * @param oldValues Previous state (for updates)
 * @param newValues New state (for creates/updates)
 * @param success Whether operation succeeded
 * @param errorMessage Error message if failed
 */
export async function logUserAction(
  db: any,
  req: any,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValues?: Record<string, any> | null,
  newValues?: Record<string, any> | null,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  const authContext = getAuthContext(req);
  await createAuditLog(db, {
    ...authContext,
    action,
    resourceType,
    resourceId,
    oldValues: oldValues ?? null,
    newValues: newValues ?? null,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
    success,
    errorMessage: errorMessage ?? null,
  });
}

/**
 * Helper to create change tracking data
 * Useful for capturing before/after state in updates
 *
 * @param before Previous object state
 * @param after New object state
 * @returns Object with changed fields only
 */
export function trackChanges(before: any, after: any): { changed: Record<string, any>; oldValues: Record<string, any> } {
  const changed: Record<string, any> = {};
  const oldValues: Record<string, any> = {};

  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed[key] = after[key];
      oldValues[key] = before[key];
    }
  }

  return { changed, oldValues };
}

/**
 * Action constants for consistent audit log action names
 * Helps prevent typos and makes auditing more consistent
 */
export const AuditActions = {
  // User management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_STATUS_CHANGED: 'user.status_changed',
  USER_PASSWORD_RESET: 'user.password_reset',

  // Deal/Project management
  DEAL_CREATED: 'deal.created',
  DEAL_UPDATED: 'deal.updated',
  DEAL_DELETED: 'deal.deleted',
  DEAL_STAGE_CHANGED: 'deal.stage_changed',
  DEAL_STATUS_CHANGED: 'deal.status_changed',
  DEAL_PROPERTY_ADDED: 'deal.property_added',
  DEAL_PROPERTY_UPDATED: 'deal.property_updated',
  DEAL_PROPERTY_DELETED: 'deal.property_deleted',
  DEAL_TASK_CREATED: 'deal.task_created',
  DEAL_TASK_UPDATED: 'deal.task_updated',
  DEAL_TASK_DELETED: 'deal.task_deleted',

  // Document management
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_VIEWED: 'document.viewed',
  DOCUMENT_DOWNLOADED: 'document.downloaded',
  DOCUMENT_SIGNED: 'document.signed',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_APPROVED: 'document.approved',
  DOCUMENT_REJECTED: 'document.rejected',
  SIGNER_ADDED: 'document.signer_added',
  SIGNER_REMOVED: 'document.signer_removed',

  // System configuration
  CONFIG_STAGE_CREATED: 'config.stage_created',
  CONFIG_STAGE_UPDATED: 'config.stage_updated',
  CONFIG_STAGE_DELETED: 'config.stage_deleted',
  CONFIG_PROGRAM_UPDATED: 'config.program_updated',
  CONFIG_WORKFLOW_CHANGED: 'config.workflow_changed',
  CONFIG_TEMPLATE_UPDATED: 'config.template_updated',
  CONFIG_SETTINGS_UPDATED: 'config.settings_updated',

  // Permission and access
  PERMISSION_UPDATED: 'permission.updated',
  PERMISSION_DENIED: 'permission.denied',
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
  API_KEY_USED: 'api_key.used',

  // Authentication
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGED: 'auth.password_changed',
  PASSWORD_RESET: 'auth.password_reset',
  ACCOUNT_LOCKED: 'auth.account_locked',

  // Data access and export
  DATA_EXPORTED: 'data.exported',
  REPORT_GENERATED: 'report.generated',
  SETTINGS_VIEWED: 'settings.viewed',
} as const;

/**
 * Resource type constants for audit logging
 */
export const ResourceTypes = {
  USER: 'user',
  DEAL: 'deal',
  DEAL_PROPERTY: 'dealProperty',
  DEAL_TASK: 'dealTask',
  DOCUMENT: 'document',
  SIGNER: 'signer',
  DEAL_STAGE: 'dealStage',
  LOAN_PROGRAM: 'loanProgram',
  WORKFLOW: 'workflow',
  TEMPLATE: 'documentTemplate',
  PERMISSION: 'permission',
  API_KEY: 'apiKey',
  SYSTEM_CONFIG: 'systemConfig',
} as const;
