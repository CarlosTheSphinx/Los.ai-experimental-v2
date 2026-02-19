/**
 * OneDrive integration service for file uploads via Microsoft Graph API.
 * Uses the same OAuth tokens stored during Microsoft connection (microsoftConnect.ts).
 */
import { db } from '../db';
import { users, projects, systemSettings } from '@shared/schema';
import { eq, isNotNull, or } from 'drizzle-orm';
import { decryptToken, encryptToken } from '../utils/encryption';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// ======================== Token Management ========================

async function getAdminWithMicrosoftTokens(): Promise<{
  id: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
} | null> {
  const admins = await db.select({
    id: users.id,
    role: users.role,
    microsoftRefreshToken: users.microsoftRefreshToken,
    microsoftAccessToken: users.microsoftAccessToken,
    microsoftTokenExpiresAt: users.microsoftTokenExpiresAt,
  })
    .from(users)
    .where(eq(users.isActive, true))
    .limit(50);

  const admin = admins.find(
    (a) => a.microsoftRefreshToken && (a.role === 'super_admin' || a.role === 'admin')
  );

  if (!admin || !admin.microsoftRefreshToken) return null;

  return {
    id: admin.id,
    accessToken: admin.microsoftAccessToken ? decryptToken(admin.microsoftAccessToken) : '',
    refreshToken: decryptToken(admin.microsoftRefreshToken),
    tokenExpiresAt: admin.microsoftTokenExpiresAt,
  };
}

async function getValidAccessToken(): Promise<{ token: string; userId: number }> {
  const admin = await getAdminWithMicrosoftTokens();
  if (!admin) {
    throw new Error('ONEDRIVE_NOT_CONNECTED: No admin with Microsoft tokens found.');
  }

  // Check if token is still valid (with 5-min buffer)
  const isExpired = !admin.tokenExpiresAt || admin.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (!isExpired && admin.accessToken) {
    return { token: admin.accessToken, userId: admin.id };
  }

  // Refresh the token
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('ONEDRIVE_NOT_CONFIGURED: MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET are required.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: admin.refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/.default offline_access',
  });

  const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ONEDRIVE_TOKEN_REFRESH_FAILED: ${err}`);
  }

  const tokens = await resp.json() as { access_token: string; refresh_token?: string; expires_in: number };

  // Persist refreshed tokens
  const updateData: any = {
    microsoftAccessToken: encryptToken(tokens.access_token),
    microsoftTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  };
  if (tokens.refresh_token) {
    updateData.microsoftRefreshToken = encryptToken(tokens.refresh_token);
  }
  await db.update(users).set(updateData).where(eq(users.id, admin.id));

  return { token: tokens.access_token, userId: admin.id };
}

// ======================== OneDrive Operations ========================

async function getOneDriveParentFolderId(): Promise<string | null> {
  const [setting] = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, 'onedrive_parent_folder_id'));
  return setting?.settingValue || null;
}

export async function isOneDriveEnabled(): Promise<boolean> {
  try {
    const admin = await getAdminWithMicrosoftTokens();
    return !!admin;
  } catch {
    return false;
  }
}

export async function ensureOneDriveDealFolder(projectId: number): Promise<{
  folderId: string;
  folderUrl: string;
}> {
  const [project] = await db.select({
    id: projects.id,
    propertyAddress: projects.propertyAddress,
    projectName: projects.projectName,
    metadata: projects.metadata,
  })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Check if we already have a OneDrive folder stored in metadata
  const meta = (project.metadata || {}) as Record<string, any>;
  if (meta.oneDriveFolderId && meta.oneDriveFolderUrl) {
    return { folderId: meta.oneDriveFolderId, folderUrl: meta.oneDriveFolderUrl };
  }

  const { token } = await getValidAccessToken();
  const parentFolderId = await getOneDriveParentFolderId();

  // Folder name: use property address, fall back to project name
  const folderName = (project.propertyAddress || project.projectName || `Deal ${projectId}`)
    .replace(/[\\/:*?"<>|]/g, '_')
    .substring(0, 200);

  // Create folder
  const createUrl = parentFolderId
    ? `${GRAPH_BASE}/me/drive/items/${parentFolderId}/children`
    : `${GRAPH_BASE}/me/drive/root/children`;

  const resp = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to create OneDrive folder: ${err}`);
  }

  const folder = await resp.json() as { id: string; webUrl: string };

  // Store folder info in project metadata
  await db.update(projects)
    .set({
      metadata: {
        ...meta,
        oneDriveFolderId: folder.id,
        oneDriveFolderUrl: folder.webUrl,
      },
    })
    .where(eq(projects.id, projectId));

  return { folderId: folder.id, folderUrl: folder.webUrl };
}

export async function uploadFileToOneDrive(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string = 'application/octet-stream',
): Promise<{ fileId: string; webUrl: string }> {
  const { token } = await getValidAccessToken();

  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_');

  // For files under 4MB, use simple upload
  if (fileBuffer.length < 4 * 1024 * 1024) {
    const resp = await fetch(
      `${GRAPH_BASE}/me/drive/items/${folderId}:/${encodeURIComponent(safeName)}:/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType,
        },
        body: fileBuffer,
      },
    );

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Failed to upload file to OneDrive: ${err}`);
    }

    const file = await resp.json() as { id: string; webUrl: string };
    return { fileId: file.id, webUrl: file.webUrl };
  }

  // For larger files, use upload session
  const sessionResp = await fetch(
    `${GRAPH_BASE}/me/drive/items/${folderId}:/${encodeURIComponent(safeName)}:/createUploadSession`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item: { '@microsoft.graph.conflictBehavior': 'rename' },
      }),
    },
  );

  if (!sessionResp.ok) {
    const err = await sessionResp.text();
    throw new Error(`Failed to create upload session: ${err}`);
  }

  const session = await sessionResp.json() as { uploadUrl: string };
  const chunkSize = 3_276_800; // 3.125 MB chunks (recommended by Microsoft)
  let offset = 0;

  while (offset < fileBuffer.length) {
    const end = Math.min(offset + chunkSize, fileBuffer.length);
    const chunk = fileBuffer.subarray(offset, end);

    const chunkResp = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${offset}-${end - 1}/${fileBuffer.length}`,
      },
      body: chunk,
    });

    if (chunkResp.status === 200 || chunkResp.status === 201) {
      // Upload complete
      const file = await chunkResp.json() as { id: string; webUrl: string };
      return { fileId: file.id, webUrl: file.webUrl };
    }

    if (chunkResp.status !== 202) {
      const err = await chunkResp.text();
      throw new Error(`Upload chunk failed: ${err}`);
    }

    offset = end;
  }

  throw new Error('Upload completed but no file response received');
}
