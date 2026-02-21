/**
 * Shared helper for syncing signed PandaDoc documents into deal Stage 1
 * as a "Signed Agreement" and pushing to cloud storage (Google Drive / OneDrive).
 *
 * Used by both the PandaDoc webhook handler (routes.ts) and the polling backstop (pandadocSync.ts).
 */
import { db } from '../db';
import { dealDocuments, projectStages } from '@shared/schema';
import { eq, and, asc } from 'drizzle-orm';
import { Readable } from 'stream';
import * as fs from 'fs';
import { ObjectStorageService } from '../replit_integrations/object_storage';
import { storage } from '../storage';

export interface SyncSignedDocumentParams {
  projectId: number;
  envelopeId: number;
  externalDocumentId: string;
  documentName: string;
  /** Filesystem path to the signed PDF (webhook path) */
  signedPdfPath?: string;
  /** Buffer of the signed PDF (polling path — will be uploaded to object storage) */
  signedPdfBuffer?: Buffer;
  fileSize: number;
  createdBy: number | null;
}

export interface SyncSignedDocumentResult {
  dealDocumentId: number | null;
  action: 'updated_slot' | 'inserted_new' | 'skipped_duplicate';
  driveSync: 'synced' | 'not_enabled' | 'error' | 'skipped';
  onedriveSync: 'synced' | 'not_enabled' | 'error' | 'skipped';
}

const SIGNED_AGREEMENT_NAME = 'Signed Agreement';

export async function syncSignedDocumentToDeal(
  params: SyncSignedDocumentParams
): Promise<SyncSignedDocumentResult> {
  const {
    projectId, envelopeId, externalDocumentId,
    documentName, signedPdfPath, signedPdfBuffer, fileSize, createdBy,
  } = params;

  const result: SyncSignedDocumentResult = {
    dealDocumentId: null,
    action: 'skipped_duplicate',
    driveSync: 'skipped',
    onedriveSync: 'skipped',
  };

  const dedupDescription = `Signed PandaDoc document (${externalDocumentId}): ${documentName}`;

  // ── 1. Dedup check — skip if this exact signed doc was already processed ──
  const [existingSignedDoc] = await db.select({ id: dealDocuments.id })
    .from(dealDocuments)
    .where(and(
      eq(dealDocuments.dealId, projectId),
      eq(dealDocuments.documentDescription, dedupDescription),
    ))
    .limit(1);

  if (existingSignedDoc) {
    console.log(`[SignedDocSync] Signed document already exists for deal ${projectId}, skipping`);
    result.dealDocumentId = existingSignedDoc.id;
    return result;
  }

  // ── 2. Determine file path (upload to object storage if only buffer provided) ──
  let filePath = signedPdfPath || null;
  const safeName = (documentName || 'signed-document').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${safeName}-signed.pdf`;

  if (!filePath && signedPdfBuffer) {
    const objectStorageService = new ObjectStorageService();
    const { objectPath } = await objectStorageService.uploadFile(
      signedPdfBuffer, fileName, 'application/pdf'
    );
    filePath = objectPath;
  }

  if (!filePath && signedPdfPath) {
    // Upload filesystem file to object storage as well for consistency
    const buf = await fs.promises.readFile(signedPdfPath);
    const objectStorageService = new ObjectStorageService();
    const { objectPath } = await objectStorageService.uploadFile(
      buf, fileName, 'application/pdf'
    );
    filePath = objectPath;
  }

  // ── 3. Find Stage 1 ──
  const [stage1] = await db.select()
    .from(projectStages)
    .where(eq(projectStages.projectId, projectId))
    .orderBy(asc(projectStages.stageOrder))
    .limit(1);

  // ── 4. Find or create "Signed Agreement" slot ──
  const [existingSlot] = await db.select()
    .from(dealDocuments)
    .where(and(
      eq(dealDocuments.dealId, projectId),
      eq(dealDocuments.documentName, SIGNED_AGREEMENT_NAME),
      stage1 ? eq(dealDocuments.stageId, stage1.id) : undefined as any,
    ))
    .limit(1);

  let docId: number;

  if (existingSlot && existingSlot.status === 'pending') {
    // Update the existing placeholder slot with the signed file
    await db.update(dealDocuments)
      .set({
        documentDescription: dedupDescription,
        status: 'approved',
        filePath,
        fileName,
        fileSize,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
        uploadedBy: createdBy,
      })
      .where(eq(dealDocuments.id, existingSlot.id));
    docId = existingSlot.id;
    result.action = 'updated_slot';
    console.log(`[SignedDocSync] Updated existing "Signed Agreement" slot (doc ${docId}) in deal ${projectId}`);
  } else {
    // Insert a new record
    const [inserted] = await db.insert(dealDocuments).values({
      dealId: projectId,
      stageId: stage1?.id || null,
      documentName: SIGNED_AGREEMENT_NAME,
      documentCategory: 'closing_docs',
      documentDescription: dedupDescription,
      status: 'approved',
      isRequired: true,
      assignedTo: 'admin',
      visibility: 'all',
      filePath,
      fileName,
      fileSize,
      mimeType: 'application/pdf',
      uploadedAt: new Date(),
      uploadedBy: createdBy,
      sortOrder: 0,
    }).returning();
    docId = inserted.id;
    result.action = 'inserted_new';
    console.log(`[SignedDocSync] Inserted new "Signed Agreement" (doc ${docId}) in deal ${projectId} at ${stage1?.stageName || 'Stage 1'}`);
  }

  result.dealDocumentId = docId;

  // ── 5. Activity log ──
  try {
    await storage.createProjectActivity({
      projectId,
      userId: createdBy!,
      activityType: 'document_uploaded',
      activityDescription: `Signed agreement "${documentName}" received from PandaDoc and added to ${stage1?.stageName || 'Stage 1'}`,
      visibleToBorrower: true,
    });
  } catch (actErr: any) {
    console.error(`[SignedDocSync] Activity log error:`, actErr.message);
  }

  // ── 6. Get a buffer for cloud uploads ──
  let pdfBuffer: Buffer | null = signedPdfBuffer || null;
  if (!pdfBuffer && signedPdfPath) {
    try {
      pdfBuffer = await fs.promises.readFile(signedPdfPath);
    } catch {
      // File may not exist if already in object storage
    }
  }

  // ── 7. Google Drive sync ──
  try {
    const { isDriveIntegrationEnabled, ensureProjectFolder, uploadFileToProjectFolder } = await import('./googleDrive');
    const driveEnabled = await isDriveIntegrationEnabled();
    if (driveEnabled) {
      await ensureProjectFolder(projectId);

      let fileStream: Readable;
      if (signedPdfPath && fs.existsSync(signedPdfPath)) {
        fileStream = fs.createReadStream(signedPdfPath);
      } else if (pdfBuffer) {
        fileStream = Readable.from(pdfBuffer);
      } else {
        throw new Error('No file source available for Drive upload');
      }

      const driveResult = await uploadFileToProjectFolder({
        projectId,
        fileStream,
        originalName: fileName,
        mimeType: 'application/pdf',
      });

      await db.update(dealDocuments)
        .set({
          googleDriveFileId: driveResult.fileId,
          googleDriveFileUrl: driveResult.webViewLink,
          driveUploadStatus: 'SYNCED',
        })
        .where(eq(dealDocuments.id, docId));

      result.driveSync = 'synced';
      console.log(`[SignedDocSync] Signed PDF synced to Google Drive for deal ${projectId}`);
    } else {
      result.driveSync = 'not_enabled';
    }
  } catch (driveErr: any) {
    result.driveSync = 'error';
    console.error(`[SignedDocSync] Google Drive sync error:`, driveErr.message);
  }

  // ── 8. OneDrive sync ──
  try {
    const { isOneDriveEnabled, ensureOneDriveDealFolder, uploadFileToOneDrive } = await import('./oneDrive');
    const onedriveEnabled = await isOneDriveEnabled();
    if (onedriveEnabled && pdfBuffer) {
      const folderInfo = await ensureOneDriveDealFolder(projectId);
      await uploadFileToOneDrive(
        folderInfo.folderId,
        fileName,
        pdfBuffer,
        'application/pdf',
      );
      result.onedriveSync = 'synced';
      console.log(`[SignedDocSync] Signed PDF synced to OneDrive for deal ${projectId}`);
    } else if (!onedriveEnabled) {
      result.onedriveSync = 'not_enabled';
    } else {
      result.onedriveSync = 'error';
      console.error(`[SignedDocSync] OneDrive sync skipped — no PDF buffer available`);
    }
  } catch (onedriveErr: any) {
    result.onedriveSync = 'error';
    console.error(`[SignedDocSync] OneDrive sync error:`, onedriveErr.message);
  }

  return result;
}
