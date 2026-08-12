import { Express, Response } from 'express';
import { AuthRequest } from '../auth';
import { db } from '../db';
import { notifications, pilotSurveyResponses } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { getPendingSurveysForUser } from '../services/pilotSurveyService';

export function registerPilotSurveyRoutes(
  app: Express,
  authenticateUser: (req: AuthRequest, res: Response, next: Function) => void
) {
  // GET /api/pilot/surveys/pending — returns unresponded surveys due for the authenticated broker
  app.get('/api/pilot/surveys/pending', authenticateUser, async (req: AuthRequest, res: Response) => {
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
    try {
      const userId = req.user!.id;
      const { surveyType, notificationId, responses, dismissed } = req.body;

      if (!surveyType) {
        return res.status(400).json({ error: 'surveyType is required' });
      }

      // Validate notificationId belongs to the requesting user (prevents cross-user FK in survey responses)
      if (notificationId) {
        const [notif] = await db.select({ id: notifications.id })
          .from(notifications)
          .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
          .limit(1);
        if (!notif) return res.status(403).json({ error: 'Notification not found' });
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
}
