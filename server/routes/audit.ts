import type { Express, Request, Response } from 'express';
import { eq, and, gte, lte, ilike, desc } from 'drizzle-orm';
import { auditLogs, users } from '@shared/schema';

/**
 * Week 3: Audit Log Search and Export Routes
 * Provides compliance-grade audit log querying and export capabilities
 */

// Helper function to escape CSV values
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Helper function to convert array of objects to CSV
function arrayToCsv(data: any[], headers: string[]): string {
  const csvHeaders = headers.map(h => escapeCsvValue(h)).join(',');
  const csvRows = data.map(row => 
    headers.map(header => escapeCsvValue(row[header])).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

export function setupAuditRoutes(app: Express, { db }: any) {
  // GET /api/admin/audit-logs - Query audit logs with filtering and pagination
  app.get('/api/admin/audit-logs', async (req: any, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Verify super-admin access
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = user[0];
      const userRoles = userData.roles && userData.roles.length > 0
        ? userData.roles
        : userData.role ? [userData.role] : ['user'];

      if (!userRoles.includes('super_admin')) {
        return res.status(403).json({ error: 'Super-admin access required' });
      }

      // Parse query parameters
      const {
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        success,
        limit = '50',
        offset = '0',
      } = req.query;

      const pageLimit = Math.min(parseInt(limit as string) || 50, 500);
      const pageOffset = parseInt(offset as string) || 0;

      // Build query conditions
      const conditions: any[] = [];

      if (userId) {
        conditions.push(eq(auditLogs.userId, parseInt(userId as string)));
      }

      if (action) {
        conditions.push(ilike(auditLogs.action, `%${action}%`));
      }

      if (resourceType) {
        conditions.push(ilike(auditLogs.resourceType, `%${resourceType}%`));
      }

      if (resourceId) {
        conditions.push(eq(auditLogs.resourceId, resourceId as string));
      }

      if (startDate) {
        const start = new Date(startDate as string);
        conditions.push(gte(auditLogs.timestamp, start));
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLogs.timestamp, end));
      }

      if (success !== undefined) {
        conditions.push(eq(auditLogs.success, success === 'true'));
      }

      // Execute query
      const logs = await db
        .select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.timestamp))
        .limit(pageLimit)
        .offset(pageOffset);

      // Get total count for pagination metadata
      const countResult = await db
        .select({ count: db.sql`COUNT(*)` })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = parseInt(countResult[0]?.count || '0');

      // Format response with parsed JSON fields
      const formattedLogs = logs.map((log: any) => ({
        ...log,
        oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
        newValues: log.newValues ? JSON.parse(log.newValues) : null,
      }));

      res.json({
        logs: formattedLogs,
        pagination: {
          total,
          limit: pageLimit,
          offset: pageOffset,
          hasMore: pageOffset + pageLimit < total,
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  // GET /api/admin/audit-logs/:id - Get single audit log entry with full details
  app.get('/api/admin/audit-logs/:id', async (req: any, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = user[0];
      const userRoles = userData.roles && userData.roles.length > 0
        ? userData.roles
        : userData.role ? [userData.role] : ['user'];

      if (!userRoles.includes('super_admin')) {
        return res.status(403).json({ error: 'Super-admin access required' });
      }

      const log = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, parseInt(req.params.id)))
        .limit(1);

      if (!log.length) {
        return res.status(404).json({ error: 'Audit log entry not found' });
      }

      const entry = log[0];
      res.json({
        ...entry,
        oldValues: entry.oldValues ? JSON.parse(entry.oldValues) : null,
        newValues: entry.newValues ? JSON.parse(entry.newValues) : null,
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  // GET /api/admin/audit-logs/export - Export audit logs to CSV
  app.get('/api/admin/audit-logs/export', async (req: any, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = user[0];
      const userRoles = userData.roles && userData.roles.length > 0
        ? userData.roles
        : userData.role ? [userData.role] : ['user'];

      if (!userRoles.includes('super_admin')) {
        return res.status(403).json({ error: 'Super-admin access required' });
      }

      // Parse query parameters for filtering
      const {
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        success,
      } = req.query;

      const conditions: any[] = [];

      if (userId) {
        conditions.push(eq(auditLogs.userId, parseInt(userId as string)));
      }

      if (action) {
        conditions.push(ilike(auditLogs.action, `%${action}%`));
      }

      if (resourceType) {
        conditions.push(ilike(auditLogs.resourceType, `%${resourceType}%`));
      }

      if (resourceId) {
        conditions.push(eq(auditLogs.resourceId, resourceId as string));
      }

      if (startDate) {
        const start = new Date(startDate as string);
        conditions.push(gte(auditLogs.timestamp, start));
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLogs.timestamp, end));
      }

      if (success !== undefined) {
        conditions.push(eq(auditLogs.success, success === 'true'));
      }

      // Fetch all matching records (with reasonable limit)
      const logs = await db
        .select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.timestamp))
        .limit(10000); // Max 10k records for export

      // Format for CSV export
      const csvData = logs.map((log: any) => ({
        timestamp: log.timestamp.toISOString(),
        userId: log.userId || '',
        userEmail: log.userEmail || '',
        userRole: log.userRole || '',
        action: log.action || '',
        resourceType: log.resourceType || '',
        resourceId: log.resourceId || '',
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || '',
        statusCode: log.statusCode || '',
        success: log.success ? 'Yes' : 'No',
        errorMessage: log.errorMessage || '',
        oldValues: log.oldValues || '',
        newValues: log.newValues || '',
      }));

      // Generate CSV
      const headers = [
        'timestamp',
        'userId',
        'userEmail',
        'userRole',
        'action',
        'resourceType',
        'resourceId',
        'ipAddress',
        'userAgent',
        'statusCode',
        'success',
        'errorMessage',
        'oldValues',
        'newValues',
      ];

      const csv = arrayToCsv(csvData, headers);

      // Set response headers for file download
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({ error: 'Failed to export audit logs' });
    }
  });

  // GET /api/admin/audit-logs/user/:userId - Get activity history for specific user
  app.get('/api/admin/audit-logs/user/:userId', async (req: any, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = user[0];
      const userRoles = userData.roles && userData.roles.length > 0
        ? userData.roles
        : userData.role ? [userData.role] : ['user'];

      const targetUserId = parseInt(req.params.userId);

      // Allow users to view their own history, or super-admin to view anyone
      if (req.user.id !== targetUserId && !userRoles.includes('super_admin')) {
        return res.status(403).json({ error: 'Cannot view other user activity' });
      }

      // Parse pagination params
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      // Query user's activities
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, targetUserId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: db.sql`COUNT(*)` })
        .from(auditLogs)
        .where(eq(auditLogs.userId, targetUserId));

      const total = parseInt(countResult[0]?.count || '0');

      // Format response
      const formattedLogs = logs.map((log: any) => ({
        ...log,
        oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
        newValues: log.newValues ? JSON.parse(log.newValues) : null,
      }));

      res.json({
        userId: targetUserId,
        logs: formattedLogs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  });
}
