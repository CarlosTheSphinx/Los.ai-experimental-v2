/**
 * Underwriting Orchestrator
 * Two-agent pipeline:
 *   1. underwriting_extractor  — compiles a comprehensive Deal Summary from all available data
 *   2. underwriting_analyst    — compares the Deal Summary against credit policy rules → produces report
 * Stores the result in underwriting_reports and generates a PDF.
 */

import { db } from "../db";
import {
  projects,
  loanPrograms,
  dealDocuments,
  dealNotes,
  programReviewRules,
  creditPolicies,
  documentExtractions,
  underwritingReports,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { executeAgent } from "./agentRunner";
import { extractAllDealDocuments } from "./documentExtractor";
import { generateUnderwritingReportPdf } from "../pdf/underwritingReportPdf";

export interface StartUnderwritingParams {
  projectId: number;
  triggeredBy?: number;
}

export async function startUnderwritingOrchestration(
  params: StartUnderwritingParams
): Promise<{ reportId: number }> {
  const { projectId, triggeredBy } = params;

  // Create report record in "running" state
  const [report] = await db
    .insert(underwritingReports)
    .values({ projectId, status: "running", triggeredBy: triggeredBy ?? null })
    .returning();

  // Run async so the HTTP response returns immediately
  runOrchestration(report.id, projectId, triggeredBy).catch((err) => {
    console.error(`[Underwriting] Orchestration failed for project ${projectId}:`, err);
    db.update(underwritingReports)
      .set({ status: "failed", errorMessage: String(err?.message || err), updatedAt: new Date() })
      .where(eq(underwritingReports.id, report.id))
      .catch(() => {});
  });

  return { reportId: report.id };
}

async function runOrchestration(reportId: number, projectId: number, triggeredBy?: number) {
  // ── Fetch all context ──────────────────────────────────────────────────────
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).then(r => r[0]);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const program = project.programId
    ? await db.select().from(loanPrograms).where(eq(loanPrograms.id, project.programId)).then(r => r[0])
    : null;

  const notes = await db.select().from(dealNotes).where(eq(dealNotes.dealId, projectId)).orderBy(desc(dealNotes.createdAt));

  const docs = await db.select().from(dealDocuments).where(eq(dealDocuments.dealId, projectId));

  const extractions = await db.select().from(documentExtractions).where(eq(documentExtractions.projectId, projectId));

  // Extract text from uploaded PDF/text documents
  let documentTextBlocks: string[] = [];
  try {
    const extracted = await extractAllDealDocuments(projectId);
    documentTextBlocks = extracted.map((e: any) =>
      `[${e.documentName || e.documentType || 'Document'}]\n${e.text || e.extractedText || ''}`
    );
  } catch (_) {
    // Non-fatal — proceed with extractions from DB if available
  }

  // Supplement with stored extractions
  for (const ex of extractions) {
    const fields = ex.extractedFields as Record<string, any> | null;
    if (fields && Object.keys(fields).length > 0) {
      documentTextBlocks.push(
        `[Extracted fields from doc #${ex.dealDocumentId}]\n` +
        Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')
      );
    }
  }

  // Credit policy rules for this program
  const reviewRules = project.programId
    ? await db.select().from(programReviewRules)
        .where(and(eq(programReviewRules.programId, project.programId), eq(programReviewRules.isActive, true)))
        .orderBy(programReviewRules.sortOrder)
    : [];

  // Linked credit policy (from program)
  let creditPolicy = null;
  if (program?.creditPolicyId) {
    creditPolicy = await db.select().from(creditPolicies)
      .where(eq(creditPolicies.id, program.creditPolicyId)).then(r => r[0] ?? null);
  }

  // ── Agent 1: Underwriting Extractor ───────────────────────────────────────
  const extractorContext = {
    deal: {
      id: project.id,
      projectName: project.projectName,
      projectNumber: project.projectNumber,
      loanAmount: project.loanAmount,
      interestRate: project.interestRate,
      loanTermMonths: project.loanTermMonths,
      loanType: project.loanType,
      propertyAddress: project.propertyAddress,
      propertyType: project.propertyType,
      propertyState: (project as any).propertyState,
      asIsValue: (project as any).asIsValue,
      ltv: (project as any).ltv,
      borrowerName: project.borrowerName,
      borrowerEmail: project.borrowerEmail,
      borrowerPhone: project.borrowerPhone,
      brokerName: (project as any).brokerName,
      brokerEmail: (project as any).brokerEmail,
      brokerCompany: (project as any).brokerCompany,
      status: project.status,
      currentStage: project.currentStage,
      applicationDate: project.applicationDate,
      targetCloseDate: project.targetCloseDate,
      notes: project.notes,
      internalNotes: (project as any).internalNotes,
      programName: program?.name,
      programLoanType: program?.loanType,
    },
    dealNotes: notes.map(n => ({ content: n.content, type: n.noteType, createdAt: n.createdAt })),
    uploadedDocuments: docs.map(d => ({
      name: d.documentName,
      category: d.documentCategory,
      status: d.status,
      fileName: d.fileName,
    })),
    documentText: documentTextBlocks.join('\n\n---\n\n').slice(0, 30000),
  };

  const extractorResult = await executeAgent({
    agentType: "underwriting_extractor",
    projectId,
    triggeredBy,
    triggerType: "underwriting",
    contextData: extractorContext,
  });

  if (!extractorResult.success) {
    throw new Error(`Extractor agent failed: ${extractorResult.error}`);
  }

  let dealSummary: any = {};
  try {
    dealSummary = typeof extractorResult.response === 'string'
      ? JSON.parse(extractorResult.response)
      : extractorResult.response;
  } catch {
    dealSummary = { raw: extractorResult.response };
  }

  // Save partial result
  await db.update(underwritingReports)
    .set({ dealSummary, updatedAt: new Date() })
    .where(eq(underwritingReports.id, reportId));

  // ── Agent 2: Underwriting Analyst ─────────────────────────────────────────
  const analystContext = {
    dealSummary,
    program: program ? {
      name: program.name,
      loanType: program.loanType,
      minLoanAmount: program.minLoanAmount,
      maxLoanAmount: program.maxLoanAmount,
      minLtv: program.minLtv,
      maxLtv: program.maxLtv,
      minInterestRate: program.minInterestRate,
      maxInterestRate: program.maxInterestRate,
      minDscr: program.minDscr,
      minFico: program.minFico,
      minUnits: program.minUnits,
      maxUnits: program.maxUnits,
      termOptions: program.termOptions,
      eligiblePropertyTypes: program.eligiblePropertyTypes,
      reviewGuidelines: program.reviewGuidelines,
    } : null,
    creditPolicy: creditPolicy ? { name: creditPolicy.name, description: creditPolicy.description } : null,
    reviewRules: reviewRules.map(r => ({
      title: r.ruleTitle,
      description: r.ruleDescription,
      type: r.ruleType,
      severity: r.severity,
      category: r.category,
      documentType: r.documentType,
    })),
  };

  const analystResult = await executeAgent({
    agentType: "underwriting_analyst",
    projectId,
    triggeredBy,
    triggerType: "underwriting",
    contextData: analystContext,
  });

  if (!analystResult.success) {
    throw new Error(`Analyst agent failed: ${analystResult.error}`);
  }

  let report: any = {};
  try {
    report = typeof analystResult.response === 'string'
      ? JSON.parse(analystResult.response)
      : analystResult.response;
  } catch {
    report = { raw: analystResult.response };
  }

  const reportData = report?.underwritingReport || report;
  const score = typeof reportData.score === 'number' ? reportData.score : null;
  const overallLikelihood = reportData.overallLikelihood || null;

  // ── Generate PDF ───────────────────────────────────────────────────────────
  let pdfData: string | null = null;
  try {
    const pdfBuffer = await generateUnderwritingReportPdf({
      dealName: project.projectName || `Deal #${project.id}`,
      borrowerName: project.borrowerName || 'N/A',
      propertyAddress: project.propertyAddress || 'N/A',
      loanAmount: project.loanAmount || 0,
      loanType: project.loanType || 'N/A',
      programName: program?.name || 'N/A',
      score: score ?? 0,
      overallLikelihood: overallLikelihood ?? 'N/A',
      generatedAt: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET',
      dealSummary,
      report,
    });
    pdfData = pdfBuffer.toString('base64');
  } catch (pdfErr) {
    console.error('[Underwriting] PDF generation failed:', pdfErr);
    // Non-fatal — store report without PDF
  }

  // ── Persist final result ───────────────────────────────────────────────────
  await db.update(underwritingReports)
    .set({
      status: "complete",
      report,
      score,
      overallLikelihood,
      pdfData,
      updatedAt: new Date(),
    })
    .where(eq(underwritingReports.id, reportId));

  console.log(`[Underwriting] Report ${reportId} complete — score=${score}, likelihood=${overallLikelihood}`);
}
