import type { Express, Response } from 'express';
import type { AuthRequest } from '../auth';
import type { RouteDeps } from './types';
import { eq, desc, and, sql, gt, inArray } from 'drizzle-orm';
import { teamChats, teamChatParticipants, teamChatMessages, users } from '@shared/schema';
import { getTenantId } from '../utils/tenant';

export function registerTeamChatRoutes(app: Express, deps: RouteDeps) {
  const { db, authenticateUser, requireAdmin } = deps;

  app.get('/api/team-chats', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const tenantId = getTenantId(req.user!);

      const participantRows = await db.select({ chatId: teamChatParticipants.chatId })
        .from(teamChatParticipants)
        .where(eq(teamChatParticipants.userId, userId));

      const chatIds = participantRows.map((r: any) => r.chatId);
      if (chatIds.length === 0) {
        return res.json({ chats: [] });
      }

      const chats = await db.select().from(teamChats)
        .where(inArray(teamChats.id, chatIds))
        .orderBy(desc(teamChats.lastMessageAt));

      const chatsWithContext = await Promise.all(chats.map(async (chat: any) => {
        const participants = await db.select({
          userId: teamChatParticipants.userId,
          fullName: users.fullName,
          email: users.email,
          lastReadAt: teamChatParticipants.lastReadAt,
        })
          .from(teamChatParticipants)
          .innerJoin(users, eq(users.id, teamChatParticipants.userId))
          .where(eq(teamChatParticipants.chatId, chat.id));

        const lastMsg = await db.select({ body: teamChatMessages.body, createdAt: teamChatMessages.createdAt, senderId: teamChatMessages.senderId })
          .from(teamChatMessages)
          .where(eq(teamChatMessages.chatId, chat.id))
          .orderBy(desc(teamChatMessages.createdAt))
          .limit(1);

        const myParticipant = participants.find((p: any) => p.userId === userId);
        let unreadCount = 0;
        if (myParticipant) {
          const unreadResult = await db.select({ count: sql<number>`count(*)::int` })
            .from(teamChatMessages)
            .where(and(
              eq(teamChatMessages.chatId, chat.id),
              gt(teamChatMessages.createdAt, myParticipant.lastReadAt),
              sql`${teamChatMessages.senderId} != ${userId}`
            ));
          unreadCount = unreadResult[0]?.count || 0;
        }

        const senderName = lastMsg[0]?.senderId
          ? participants.find((p: any) => p.userId === lastMsg[0].senderId)?.fullName || 'Unknown'
          : null;

        return {
          ...chat,
          participants: participants.map((p: any) => ({ id: p.userId, fullName: p.fullName, email: p.email })),
          lastMessagePreview: lastMsg[0]?.body?.substring(0, 100) || null,
          lastMessageSender: senderName,
          unreadCount,
        };
      }));

      res.json({ chats: chatsWithContext });
    } catch (error) {
      console.error('Get team chats error:', error);
      res.status(500).json({ error: 'Failed to get team chats' });
    }
  });

  app.post('/api/team-chats', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const tenantId = getTenantId(req.user!);
      const { name, participantIds, initialMessage } = req.body;

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ error: 'At least one participant is required' });
      }

      const allParticipantIds = Array.from(new Set([userId, ...participantIds.map(Number)]));
      const isGroup = allParticipantIds.length > 2;

      if (!isGroup && allParticipantIds.length === 2) {
        const existingDM = await db.execute(sql`
          SELECT tc.id FROM team_chats tc
          WHERE tc.is_group = false
            AND (SELECT COUNT(*) FROM team_chat_participants tcp WHERE tcp.chat_id = tc.id) = 2
            AND EXISTS (SELECT 1 FROM team_chat_participants tcp WHERE tcp.chat_id = tc.id AND tcp.user_id = ${allParticipantIds[0]})
            AND EXISTS (SELECT 1 FROM team_chat_participants tcp WHERE tcp.chat_id = tc.id AND tcp.user_id = ${allParticipantIds[1]})
          LIMIT 1
        `);

        if ((existingDM.rows as any[]).length > 0) {
          const existingChatId = (existingDM.rows[0] as any).id;
          if (initialMessage) {
            await db.insert(teamChatMessages).values({
              chatId: existingChatId,
              senderId: userId,
              body: initialMessage,
            });
            await db.update(teamChats)
              .set({ lastMessageAt: new Date() })
              .where(eq(teamChats.id, existingChatId));
          }
          return res.json({ chat: { id: existingChatId }, existing: true });
        }
      }

      const [newChat] = await db.insert(teamChats).values({
        name: isGroup ? (name || null) : null,
        isGroup,
        createdBy: userId,
        tenantId,
      }).returning();

      await db.insert(teamChatParticipants).values(
        allParticipantIds.map(pid => ({
          chatId: newChat.id,
          userId: pid,
          lastReadAt: pid === userId ? new Date() : new Date('1970-01-01'),
        }))
      );

      if (initialMessage) {
        await db.insert(teamChatMessages).values({
          chatId: newChat.id,
          senderId: userId,
          body: initialMessage,
        });
        await db.update(teamChats)
          .set({ lastMessageAt: new Date() })
          .where(eq(teamChats.id, newChat.id));
      }

      res.json({ chat: newChat });
    } catch (error) {
      console.error('Create team chat error:', error);
      res.status(500).json({ error: 'Failed to create team chat' });
    }
  });

  app.get('/api/team-chats/:id/messages', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;

      const participant = await db.select().from(teamChatParticipants)
        .where(and(eq(teamChatParticipants.chatId, chatId), eq(teamChatParticipants.userId, userId)))
        .limit(1);

      if (!participant[0]) {
        return res.status(403).json({ error: 'Not a participant of this chat' });
      }

      const chat = await db.select().from(teamChats).where(eq(teamChats.id, chatId)).limit(1);
      if (!chat[0]) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      const chatMessages = await db.select({
        id: teamChatMessages.id,
        chatId: teamChatMessages.chatId,
        senderId: teamChatMessages.senderId,
        body: teamChatMessages.body,
        createdAt: teamChatMessages.createdAt,
        senderName: users.fullName,
        senderEmail: users.email,
      })
        .from(teamChatMessages)
        .leftJoin(users, eq(users.id, teamChatMessages.senderId))
        .where(eq(teamChatMessages.chatId, chatId))
        .orderBy(teamChatMessages.createdAt)
        .limit(500);

      const participants = await db.select({
        userId: teamChatParticipants.userId,
        fullName: users.fullName,
        email: users.email,
      })
        .from(teamChatParticipants)
        .innerJoin(users, eq(users.id, teamChatParticipants.userId))
        .where(eq(teamChatParticipants.chatId, chatId));

      res.json({ chat: chat[0], messages: chatMessages, participants });
    } catch (error) {
      console.error('Get team chat messages error:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  app.post('/api/team-chats/:id/messages', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { body } = req.body;

      if (!body || typeof body !== 'string' || !body.trim()) {
        return res.status(400).json({ error: 'Message body is required' });
      }

      const participant = await db.select().from(teamChatParticipants)
        .where(and(eq(teamChatParticipants.chatId, chatId), eq(teamChatParticipants.userId, userId)))
        .limit(1);

      if (!participant[0]) {
        return res.status(403).json({ error: 'Not a participant of this chat' });
      }

      const [newMessage] = await db.insert(teamChatMessages).values({
        chatId,
        senderId: userId,
        body: body.trim(),
      }).returning();

      await db.update(teamChats)
        .set({ lastMessageAt: new Date() })
        .where(eq(teamChats.id, chatId));

      const sender = await db.select({ fullName: users.fullName, email: users.email })
        .from(users).where(eq(users.id, userId)).limit(1);

      res.json({
        message: {
          ...newMessage,
          senderName: sender[0]?.fullName || sender[0]?.email || 'Unknown',
        }
      });
    } catch (error) {
      console.error('Send team chat message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.post('/api/team-chats/:id/read', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;

      await db.update(teamChatParticipants)
        .set({ lastReadAt: new Date() })
        .where(and(eq(teamChatParticipants.chatId, chatId), eq(teamChatParticipants.userId, userId)));

      res.json({ ok: true });
    } catch (error) {
      console.error('Mark team chat read error:', error);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  });

  app.post('/api/team-chats/:id/participants', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'userIds array is required' });
      }

      const participant = await db.select().from(teamChatParticipants)
        .where(and(eq(teamChatParticipants.chatId, chatId), eq(teamChatParticipants.userId, userId)))
        .limit(1);

      if (!participant[0]) {
        return res.status(403).json({ error: 'Not a participant of this chat' });
      }

      await db.update(teamChats).set({ isGroup: true }).where(eq(teamChats.id, chatId));

      for (const uid of userIds.map(Number)) {
        const existing = await db.select().from(teamChatParticipants)
          .where(and(eq(teamChatParticipants.chatId, chatId), eq(teamChatParticipants.userId, uid)))
          .limit(1);
        if (!existing[0]) {
          await db.insert(teamChatParticipants).values({
            chatId,
            userId: uid,
            lastReadAt: new Date('1970-01-01'),
          });
        }
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('Add participants error:', error);
      res.status(500).json({ error: 'Failed to add participants' });
    }
  });

  app.get('/api/team-chats/unread-count', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;

      const result = await db.execute(sql`
        SELECT COALESCE(SUM(cnt), 0)::int AS count FROM (
          SELECT COUNT(*) AS cnt
          FROM team_chat_messages tcm
          JOIN team_chat_participants tcp ON tcp.chat_id = tcm.chat_id AND tcp.user_id = ${userId}
          WHERE tcm.chat_id = tcp.chat_id
            AND tcm.created_at > tcp.last_read_at
            AND tcm.sender_id != ${userId}
        ) sub
      `);

      res.json({ unreadCount: (result.rows[0] as any)?.count || 0 });
    } catch (error) {
      console.error('Team chat unread count error:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });
}
