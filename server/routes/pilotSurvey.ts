import { Express, Response } from 'express';
import { AuthRequest } from '../auth';
import { db } from '../db';
import { notifications, pilotSurveyResponses, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getPendingSurveysForUser } from '../services/pilotSurveyService';

const VALID_SURVEY_TYPES = ['day7', 'day30', 'day60'] as const;
const ADMIN_ROLES = ['super_admin', 'lender', 'processor', 'admin', 'staff'];

// Mirrors the non-optional fields from client SURVEY_QUESTIONS
const REQUIRED_FIELDS_BY_SURVEY_TYPE: Record<typeof VALID_SURVEY_TYPES[number], string[]> = {
  day7: ['dealExtractionRating', 'biggestBlocker', 'payingCustomerReason'],
  day30: ['dealsSubmitted', 'workflowImprovement'],
  day60: ['totalDeals', 'timeSaved', 'biggestBenefit', 'biggestFriction', 'npsScore'],
};

export function registerPilotSurveyRoutes(
  app: Express,
  authenticateUser: (req: AuthRequest, res: Response, next: Function) => void
) {
  // GET /api/pilot/surveys/pending — returns unresponded surveys due for the authenticated broker
  app.get('/api/pilot/surveys/pending', authenticateUser, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'broker') {
      return res.status(403).json({ error: 'Pilot surveys are for broker users only' });
    }
    try {
      const userId = req.user!.id;
      const pending = await getPendingSurveysForUser(userId);
      res.json({ surveys: pending });
    } catch (error: any) {
      console.error('Error fetching pending pilot surveys:', error);
      res.status(500).json({ error: 'Failed to fetch surveys' });
    }
  });

  // POST /api/pilot/surveys/respond — store a survey response and mark notification as read
  app.post('/api/pilot/surveys/respond', authenticateUser, async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'broker') {
      return res.status(403).json({ error: 'Pilot surveys are for broker users only' });
    }
    try {
      const userId = req.user!.id;
      const { surveyType, notificationId, responses, dismissed } = req.body;

      if (!surveyType) {
        return res.status(400).json({ error: 'surveyType is required' });
      }

      if (!VALID_SURVEY_TYPES.includes(surveyType)) {
        return res.status(400).json({ error: 'Invalid surveyType' });
      }

      // Validate notificationId belongs to the requesting user (prevents cross-user FK in survey responses)
      if (notificationId) {
        const [notif] = await db.select({ id: notifications.id })
          .from(notifications)
          .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
          .limit(1);
        if (!notif) return res.status(403).json({ error: 'Notification not found' });
      }

      // Server-side required-field validation (mirrors client SURVEY_QUESTIONS optional flags)
      if (!dismissed) {
        const requiredFields = REQUIRED_FIELDS_BY_SURVEY_TYPE[surveyType as typeof VALID_SURVEY_TYPES[number]];
        const safeResponses = responses && typeof responses === 'object' ? responses : {};
        const missingFields = requiredFields.filter(
          (field) => safeResponses[field] === undefined || safeResponses[field] === null || safeResponses[field] === ''
        );
        if (missingFields.length > 0) {
          return res.status(400).json({ error: `Missing required survey fields: ${missingFields.join(', ')}` });
        }
      }

      await db.insert(pilotSurveyResponses).values({
        userId,
        surveyType,
        notificationId: notificationId ?? null,
        responses: responses ?? {},
        dismissed: dismissed ?? false,
      });

      // Mark the notification as read so it no longer shows in the bell
      if (notificationId) {
        await db.update(notifications)
          .set({ isRead: true })
          .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving pilot survey response:', error);
      res.status(500).json({ error: 'Failed to save response' });
    }
  });

  // GET /api/admin/pilot-surveys — aggregated survey responses for CMO/admin
  app.get('/api/admin/pilot-surveys', authenticateUser, async (req: AuthRequest, res: Response) => {
    if (!req.user?.role || !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const surveyType = req.query.surveyType as string | undefined;

      const validatedType = surveyType && VALID_SURVEY_TYPES.includes(surveyType as any)
        ? (surveyType as typeof VALID_SURVEY_TYPES[number])
        : null;

      const whereClause = validatedType
        ? eq(pilotSurveyResponses.surveyType, validatedType)
        : undefined;

      const rows = await db.select({
        id: pilotSurveyResponses.id,
        userId: pilotSurveyResponses.userId,
        surveyType: pilotSurveyResponses.surveyType,
        responses: pilotSurveyResponses.responses,
        dismissed: pilotSurveyResponses.dismissed,
        createdAt: pilotSurveyResponses.createdAt,
        userName: users.fullName,
        userEmail: users.email,
      })
        .from(pilotSurveyResponses)
        .leftJoin(users, eq(pilotSurveyResponses.userId, users.id))
        .where(whereClause)
        .orderBy(desc(pilotSurveyResponses.createdAt))
        .limit(500);

      res.json({ responses: rows });
    } catch (error: any) {
      console.error('Error fetching admin pilot survey responses:', error);
      res.status(500).json({ error: 'Failed to fetch survey responses' });
    }
  });
}
