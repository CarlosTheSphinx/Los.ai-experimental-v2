import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const pdfParseModule = _require("pdf-parse");
const PDFParse = pdfParseModule.PDFParse || pdfParseModule;

import { db } from "../db";
import { dealDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ObjectStorageService, LocalFile } from "../replit_integrations/object_storage/objectStorage";
import * as fs from "fs";

const objectStorage = new ObjectStorageService();

export interface ExtractedDocumentContent {
  dealDocumentId: number;
  documentName: string;
  documentCategory: string;
  status: string;
  textContent: string;
  textLength: number;
  pageCount: number;
  error?: string;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const parser = new PDFParse(uint8);
    await parser.load();
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : (result?.text || "");
    const pageCount = typeof result === 'object' ? (result?.total || 0) : (parser.doc?.numPages || 0);
    parser.destroy();
    return { text, pageCount };
  } catch (error) {
    console.error("PDF parse error:", error);
    return { text: "", pageCount: 0 };
  }
}

async function getFileBuffer(filePath: string): Promise<Buffer> {
  const file = await objectStorage.getObjectEntityFile(filePath);

  if (file instanceof LocalFile) {
    const localPath = file.getLocalPath();
    return fs.readFileSync(localPath) as Buffer;
  }

  const [contents] = await (file as any).download();
  return Buffer.from(contents);
}

export async function extractAllDealDocuments(dealId: number): Promise<ExtractedDocumentContent[]> {
  const docs = await db
    .select()
    .from(dealDocuments)
    .where(eq(dealDocuments.dealId, dealId));

  const uploadedDocs = docs.filter(d => d.status === "uploaded" && d.filePath);

  console.log(`📄 Found ${uploadedDocs.length} uploaded documents (out of ${docs.length} total) for deal ${dealId}`);

  const results: ExtractedDocumentContent[] = [];

  for (const doc of uploadedDocs) {
    try {
      console.log(`  → Extracting text from: ${doc.documentName} (${doc.fileName || 'no filename'})`);

      const buffer = await getFileBuffer(doc.filePath!);
      const isPdf = (doc.mimeType || "").includes("pdf") ||
                    (doc.fileName || "").toLowerCase().endsWith(".pdf");

      let textContent = "";
      let pageCount = 0;

      if (isPdf) {
        const result = await extractTextFromPdf(buffer);
        textContent = result.text;
        pageCount = result.pageCount;
      } else {
        textContent = buffer.toString("utf-8").substring(0, 10000);
        pageCount = 1;
      }

      results.push({
        dealDocumentId: doc.id,
        documentName: doc.documentName,
        documentCategory: doc.documentCategory || "unknown",
        status: doc.status!,
        textContent: textContent.substring(0, 8000),
        textLength: textContent.length,
        pageCount,
      });

      console.log(`  ✅ Extracted ${textContent.length} chars, ${pageCount} pages from ${doc.documentName}`);
    } catch (error) {
      console.error(`  ❌ Failed to extract ${doc.documentName}:`, error);
      results.push({
        dealDocumentId: doc.id,
        documentName: doc.documentName,
        documentCategory: doc.documentCategory || "unknown",
        status: doc.status!,
        textContent: "",
        textLength: 0,
        pageCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const pendingDocs = docs.filter(d => d.status !== "uploaded" || !d.filePath);
  for (const doc of pendingDocs) {
    results.push({
      dealDocumentId: doc.id,
      documentName: doc.documentName,
      documentCategory: doc.documentCategory || "unknown",
      status: doc.status || "pending",
      textContent: "",
      textLength: 0,
      pageCount: 0,
    });
  }

  return results;
}
