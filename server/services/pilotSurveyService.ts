import { db } from '../db';
import { users, notifications, pilotSurveyResponses } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

type SurveyDay = 'day7' | 'day30' | 'day60';

const SURVEY_CONFIG: Record<SurveyDay, { daysAfterActivation: number; title: string; message: string; type: string }> = {
  day7: {
    daysAfterActivation: 7,
    title: 'Quick check-in — Day 7 of your pilot',
    message: 'How is Brokr.AI working for you so far? Take 2 minutes to share feedback.',
    type: 'pilot_survey_day7',
  },
  day30: {
    daysAfterActivation: 30,
    title: 'Day 30 Pilot Check-in',
    message: 'One month in! Complete your 30-day pilot survey to help us improve.',
    type: 'pilot_survey_day30',
  },
  day60: {
    daysAfterActivation: 60,
    title: 'Day 60 Pilot Pulse Check',
    message: '60 days in — share what\'s working and what\'s not.',
    type: 'pilot_survey_day60',
  },
};

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function checkAndQueuePilotSurveys(userId: number): Promise<void> {
  const [user] = await db.select({
    id: users.id,
    role: users.role,
    isPilotBroker: users.isPilotBroker,
    pilotActivatedAt: users.pilotActivatedAt,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user || user.role !== 'broker' || !user.isPilotBroker || !user.pilotActivatedAt) {
    return;
  }

  const days = daysSince(new Date(user.pilotActivatedAt));

  // Determine which surveys are due
  const dueSurveys: SurveyDay[] = [];
  for (const [key, cfg] of Object.entries(SURVEY_CONFIG) as [SurveyDay, typeof SURVEY_CONFIG[SurveyDay]][]) {
    if (days >= cfg.daysAfterActivation) {
      dueSurveys.push(key);
    }
  }

  if (dueSurveys.length === 0) return;

  // Check which surveys have already been sent (notification exists) or responded to
  const alreadySent = await db.select({ type: notifications.type })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      inArray(notifications.type, dueSurveys.map(d => SURVEY_CONFIG[d].type))
    ));

  const sentTypes = new Set(alreadySent.map(n => n.type));

  // Queue notifications for surveys not yet sent
  for (const surveyDay of dueSurveys) {
    const cfg = SURVEY_CONFIG[surveyDay];
    if (!sentTypes.has(cfg.type)) {
      await db.insert(notifications).values({
        userId,
        type: cfg.type,
        title: cfg.title,
        message: cfg.message,
        link: null,
      });
    }
  }
}

export async function getPendingSurveysForUser(userId: number): Promise<Array<{
  notificationId: number;
  surveyType: SurveyDay;
  title: string;
  message: string;
  createdAt: Date;
}>> {
  const surveyTypes = Object.values(SURVEY_CONFIG).map(c => c.type);

  const pendingNotifications = await db.select({
    id: notifications.id,
    type: notifications.type,
    title: notifications.title,
    message: notifications.message,
    createdAt: notifications.createdAt,
  })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
      inArray(notifications.type, surveyTypes)
    ));

  if (pendingNotifications.length === 0) return [];

  // Filter out any surveys the user has already responded to or dismissed
  const respondedTypes = await db.select({ surveyType: pilotSurveyResponses.surveyType })
    .from(pilotSurveyResponses)
    .where(eq(pilotSurveyResponses.userId, userId));

  const respondedSet = new Set(respondedTypes.map(r => r.surveyType));

  return pendingNotifications
    .filter(n => {
      const surveyDay = Object.entries(SURVEY_CONFIG).find(([, c]) => c.type === n.type)?.[0] as SurveyDay | undefined;
      return surveyDay && !respondedSet.has(surveyDay);
    })
    .map(n => {
      const surveyDay = Object.entries(SURVEY_CONFIG).find(([, c]) => c.type === n.type)![0] as SurveyDay;
      return {
        notificationId: n.id,
        surveyType: surveyDay,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
      };
    });
}
