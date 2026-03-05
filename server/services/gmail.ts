import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { emailAccounts, emailThreads, emailMessages, emailThreadDealLinks, notifications } from '@shared/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { decryptToken, encryptToken } from '../utils/encryption';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
];

export function getGmailOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  return new OAuth2Client(clientId, clientSecret);
}

export function getGmailAuthUrl(redirectUri: string, state: string): string {
  const client = getGmailOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    redirect_uri: redirectUri,
    state,
  });
}

export async function exchangeGmailCode(code: string, redirectUri: string) {
  const client = getGmailOAuthClient();
  const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });
  return tokens;
}

async function getGmailClient(accountId: number): Promise<{ gmail: gmail_v1.Gmail; account: any }> {
  const [account] = await db.select().from(emailAccounts).where(eq(emailAccounts.id, accountId));
  if (!account || !account.refreshToken) {
    throw new Error('Email account not found or not connected');
  }

  const client = getGmailOAuthClient();
  const refreshToken = decryptToken(account.refreshToken);
  const accessToken = account.accessToken ? decryptToken(account.accessToken) : undefined;
  
  const isExpired = !accessToken || !account.tokenExpiresAt || new Date() >= account.tokenExpiresAt;
  
  client.setCredentials({
    refresh_token: refreshToken,
    access_token: isExpired ? undefined : accessToken,
  });

  if (isExpired) {
    const { credentials } = await client.refreshAccessToken();
    if (credentials.access_token) {
      await db.update(emailAccounts).set({
        accessToken: encryptToken(credentials.access_token),
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      }).where(eq(emailAccounts.id, accountId));
    }
  }

  const gmail = google.gmail({ version: 'v1', auth: client });
  return { gmail, account };
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function parseEmailAddress(raw: string): { name: string; address: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ''), address: match[2].toLowerCase() };
  return { name: '', address: raw.toLowerCase().trim() };
}

function extractAttachments(payload: gmail_v1.Schema$MessagePart | undefined): Array<{ filename: string; mimeType: string; size: number; attachmentId: string }> {
  const attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId: string }> = [];
  
  function traverse(part: gmail_v1.Schema$MessagePart) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }
  
  if (payload) traverse(payload);
  return attachments;
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): { text: string; html: string } {
  let text = '';
  let html = '';
  
  function traverse(part: gmail_v1.Schema$MessagePart) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    if (part.mimeType === 'text/html' && part.body?.data) {
      html += Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    if (part.parts) {
      part.parts.forEach(traverse);
    }
  }
  
  if (payload) {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      text = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    } else if (payload.mimeType === 'text/html' && payload.body?.data) {
      html = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    } else {
      traverse(payload);
    }
  }
  
  return { text, html };
}

export async function syncEmails(accountId: number, maxResults: number = 200): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  
  try {
    await db.update(emailAccounts).set({ syncStatus: 'syncing' }).where(eq(emailAccounts.id, accountId));
    
    const { gmail, account } = await getGmailClient(accountId);
    
    const threadList = await gmail.users.threads.list({
      userId: 'me',
      maxResults,
      q: 'in:inbox OR in:sent',
    });
    
    const gmailThreads = threadList.data.threads || [];
    
    for (const gmailThread of gmailThreads) {
      try {
        if (!gmailThread.id) continue;
        
        const [existing] = await db.select().from(emailThreads)
          .where(and(
            eq(emailThreads.accountId, accountId),
            eq(emailThreads.gmailThreadId, gmailThread.id)
          ));
        
        const threadData = await gmail.users.threads.get({
          userId: 'me',
          id: gmailThread.id,
          format: 'full',
        });
        
        const threadMessages = threadData.data.messages || [];
        if (threadMessages.length === 0) continue;
        
        const firstMsg = threadMessages[0];
        const lastMsg = threadMessages[threadMessages.length - 1];
        
        const firstHeaders = firstMsg.payload?.headers;
        const lastHeaders = lastMsg.payload?.headers;
        
        const subject = getHeader(firstHeaders, 'Subject') || '(No Subject)';
        const fromRaw = getHeader(lastHeaders, 'From');
        const { name: fromName, address: fromAddress } = parseEmailAddress(fromRaw);
        
        const participantSet = new Set<string>();
        for (const msg of threadMessages) {
          const headers = msg.payload?.headers;
          [getHeader(headers, 'From'), getHeader(headers, 'To'), getHeader(headers, 'Cc')]
            .filter(Boolean)
            .forEach(addr => {
              addr.split(',').forEach(a => {
                const { address } = parseEmailAddress(a.trim());
                if (address) participantSet.add(address);
              });
            });
        }
        
        const hasAttachments = threadMessages.some(msg => extractAttachments(msg.payload).length > 0);
        const isUnread = threadMessages.some(msg => msg.labelIds?.includes('UNREAD'));
        const lastDate = lastMsg.internalDate ? new Date(parseInt(lastMsg.internalDate)) : new Date();
        
        let threadId: number;
        
        if (existing) {
          await db.update(emailThreads).set({
            subject,
            snippet: threadData.data.snippet || null,
            fromAddress,
            fromName,
            participants: Array.from(participantSet),
            messageCount: threadMessages.length,
            hasAttachments,
            isUnread,
            lastMessageAt: lastDate,
          }).where(eq(emailThreads.id, existing.id));
          threadId = existing.id;
        } else {
          const [newThread] = await db.insert(emailThreads).values({
            accountId,
            gmailThreadId: gmailThread.id,
            subject,
            snippet: threadData.data.snippet || null,
            fromAddress,
            fromName,
            participants: Array.from(participantSet),
            messageCount: threadMessages.length,
            hasAttachments,
            isUnread,
            lastMessageAt: lastDate,
          }).returning();
          threadId = newThread.id;
        }
        
        for (const msg of threadMessages) {
          if (!msg.id) continue;
          
          const [existingMsg] = await db.select().from(emailMessages)
            .where(and(
              eq(emailMessages.threadId, threadId),
              eq(emailMessages.gmailMessageId, msg.id)
            ));
          
          if (existingMsg) continue;
          
          const msgHeaders = msg.payload?.headers;
          const msgFromRaw = getHeader(msgHeaders, 'From');
          const { name: msgFromName, address: msgFromAddress } = parseEmailAddress(msgFromRaw);
          
          const toRaw = getHeader(msgHeaders, 'To');
          const toAddresses = toRaw.split(',').map(a => parseEmailAddress(a.trim()).address).filter(Boolean);
          
          const ccRaw = getHeader(msgHeaders, 'Cc');
          const ccAddresses = ccRaw ? ccRaw.split(',').map(a => parseEmailAddress(a.trim()).address).filter(Boolean) : [];
          
          const { text: bodyText, html: bodyHtml } = extractBody(msg.payload);
          const attachments = extractAttachments(msg.payload);
          
          await db.insert(emailMessages).values({
            threadId,
            gmailMessageId: msg.id,
            fromAddress: msgFromAddress,
            fromName: msgFromName,
            toAddresses,
            ccAddresses: ccAddresses.length > 0 ? ccAddresses : null,
            subject: getHeader(msgHeaders, 'Subject') || null,
            bodyText: bodyText || null,
            bodyHtml: bodyHtml || null,
            snippet: msg.snippet || null,
            attachments: attachments.length > 0 ? attachments : null,
            internalDate: msg.internalDate ? new Date(parseInt(msg.internalDate)) : null,
            isUnread: msg.labelIds?.includes('UNREAD') || false,
            labelIds: msg.labelIds || null,
          });
        }
        
        synced++;
      } catch (threadError: any) {
        errors.push(`Thread ${gmailThread.id}: ${threadError.message}`);
      }
    }
    
    await db.update(emailAccounts).set({ 
      syncStatus: 'idle', 
      lastSyncAt: new Date(),
    }).where(eq(emailAccounts.id, accountId));
    
  } catch (error: any) {
    await db.update(emailAccounts).set({ syncStatus: 'error' }).where(eq(emailAccounts.id, accountId));
    errors.push(`Sync failed: ${error.message}`);
  }
  
  return { synced, errors };
}

export async function getAttachment(accountId: number, messageId: string, attachmentId: string): Promise<{ data: Buffer; filename: string; mimeType: string } | null> {
  try {
    const { gmail } = await getGmailClient(accountId);
    
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });
    
    if (!attachment.data.data) return null;
    
    const data = Buffer.from(attachment.data.data, 'base64url');
    return { data, filename: 'attachment', mimeType: 'application/octet-stream' };
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return null;
  }
}

export async function sendReply(
  accountId: number,
  threadId: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string,
  references?: string
): Promise<{ messageId: string }> {
  const { gmail, account } = await getGmailClient(accountId);
  
  const fromEmail = account.emailAddress;
  const headers = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);
  
  const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;
  const encodedMessage = Buffer.from(rawMessage).toString('base64url');
  
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });
  
  return { messageId: result.data.id || '' };
}

export async function sendNewEmail(
  accountId: number,
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string }> {
  const { gmail, account } = await getGmailClient(accountId);

  const fromEmail = account.emailAddress;
  const headers = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
  ];

  const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;
  const encodedMessage = Buffer.from(rawMessage).toString('base64url');

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return { messageId: result.data.id || '' };
}

export async function checkLinkedThreadsForNewEmails(accountId: number): Promise<void> {
  try {
    const linkedThreads = await db.select({
      emailThread: emailThreads,
      link: emailThreadDealLinks,
    })
    .from(emailThreadDealLinks)
    .innerJoin(emailThreads, eq(emailThreadDealLinks.emailThreadId, emailThreads.id))
    .where(eq(emailThreads.accountId, accountId));
    
    const [account] = await db.select().from(emailAccounts).where(eq(emailAccounts.id, accountId));
    if (!account) return;
    
    for (const { emailThread, link } of linkedThreads) {
      if (emailThread.isUnread) {
        const [recentNotif] = await db.select().from(notifications)
          .where(and(
            eq(notifications.userId, account.userId),
            eq(notifications.type, 'new_email'),
            eq(notifications.dealId, link.dealId),
          ))
          .orderBy(desc(notifications.createdAt))
          .limit(1);
        
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (recentNotif && recentNotif.createdAt > oneHourAgo) continue;
        
        await db.insert(notifications).values({
          userId: account.userId,
          type: 'new_email',
          title: 'New Email on Linked Deal',
          message: `New email from ${emailThread.fromName || emailThread.fromAddress}: "${emailThread.subject}"`,
          dealId: link.dealId,
          link: `/messages?tab=email&threadId=${emailThread.id}`,
          isRead: false,
        });
      }
    }
  } catch (error) {
    console.error('Error checking linked threads for notifications:', error);
  }
}