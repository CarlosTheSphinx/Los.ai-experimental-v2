/**
 * Deal Intake Agent (Phase 3)
 * Processes a pinned email thread → extracts deal data → matches programs
 * → drafts & sends broker document request → updates submission
 */

import { db } from '../db';
import {
  commercialSubmissions,
  emailThreads,
  emailMessages,
  emailAccounts,
  loanPrograms,
  programDocumentTemplates,
  agentPipelineRuns,
} from '@shared/schema';
import { eq, and, or, gte, lte } from 'drizzle-orm';
import { getOpenAIClient } from '../lib/openai';
import { sendNewEmail } from '../services/gmail';

export interface DealIntakeResult {
  success: boolean;
  submissionId: number;
  pipelineRunId?: number;
  brokerEmail?: string;
  emailSent: boolean;
  extractedData?: Record<string, any>;
  matchedPrograms?: { id: number; name: string }[];
  error?: string;
}

interface ExtractedDealData {
  loanAmount: number | null;
  propertyType: string | null;
  dealType: 'acquisition' | 'refinance' | 'construction' | 'other' | null;
  borrowerName: string | null;
  brokerName: string | null;
  brokerEmail: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  summary: string;
}

// Standard doc checklist used when no programs are configured
const STANDARD_COMMERCIAL_DOCS = [
  'Executive Summary / Deal Overview',
  'Purchase Contract or Refinance Statement',
  'Rent Roll (if applicable)',
  'Last 2 Years Tax Returns (entity + personal)',
  'Personal Financial Statement',
  'Credit Authorization',
  'Property Photos / Inspection Report',
  'Appraisal (if available)',
  'Entity Documents (Operating Agreement, Articles of Incorporation)',
  'Bank Statements (last 3 months)',
];

export async function runDealIntakeAgent(submissionId: number, triggeredByUserId: number): Promise<DealIntakeResult> {
  const startTime = Date.now();
  let pipelineRunId: number | undefined;

  // Log pipeline start (no projectId required — we use submissionId as reference)
  try {
    const [run] = await db.insert(agentPipelineRuns).values({
      projectId: 1, // placeholder — agentPipelineRuns requires projectId; we use 1 as system default
      status: 'running',
      agentSequence: ['email_digest', 'program_matcher', 'doc_builder', 'email_composer', 'gmail_send', 'submission_autofill'],
      currentAgentIndex: 0,
      triggerType: 'email_pin',
      triggeredBy: triggeredByUserId,
    }).returning({ id: agentPipelineRuns.id });
    pipelineRunId = run.id;
  } catch (logErr) {
    console.warn('[DealIntakeAgent] Could not create pipeline run log:', logErr);
  }

  try {
    // ── Step 1: Fetch submission + email thread ───────────────────────────
    const [submission] = await db.select().from(commercialSubmissions)
      .where(eq(commercialSubmissions.id, submissionId));

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    if (!submission.emailThreadId) {
      throw new Error(`Submission ${submissionId} has no linked email thread`);
    }

    const [thread] = await db.select().from(emailThreads)
      .where(eq(emailThreads.id, submission.emailThreadId));

    if (!thread) {
      throw new Error(`Email thread ${submission.emailThreadId} not found`);
    }

    const messages = await db.select().from(emailMessages)
      .where(eq(emailMessages.threadId, thread.id))
      .orderBy(emailMessages.internalDate);

    const [account] = await db.select().from(emailAccounts)
      .where(eq(emailAccounts.id, thread.accountId));

    if (!account) {
      throw new Error(`Email account for thread ${thread.id} not found`);
    }

    // ── Step 2: OpenAI email digest ───────────────────────────────────────
    const openai = getOpenAIClient();
    let extractedData: ExtractedDealData = {
      loanAmount: null,
      propertyType: null,
      dealType: null,
      borrowerName: null,
      brokerName: null,
      brokerEmail: null,
      propertyAddress: null,
      propertyCity: null,
      propertyState: null,
      summary: '',
    };

    if (openai) {
      const emailText = messages.map(m => {
        const parts = [
          `From: ${m.fromAddress}`,
          `Subject: ${m.subject || thread.subject}`,
          `Date: ${m.internalDate?.toISOString() || ''}`,
          `Body:\n${m.bodyText || m.snippet || '(no body)'}`,
        ];
        if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0) {
          parts.push(`Attachments: ${(m.attachments as any[]).map((a: any) => a.filename).join(', ')}`);
        }
        return parts.join('\n');
      }).join('\n\n---\n\n');

      const extractPrompt = `You are a commercial real estate loan analyst. Extract structured deal data from this email thread.

EMAIL THREAD:
${emailText.slice(0, 8000)}

Extract the following as JSON:
{
  "loanAmount": <number or null>,
  "propertyType": <"multifamily"|"office"|"retail"|"industrial"|"mixed-use"|"land"|"construction"|"other"|null>,
  "dealType": <"acquisition"|"refinance"|"construction"|"other"|null>,
  "borrowerName": <string or null>,
  "brokerName": <string or null>,
  "brokerEmail": <string or null>,
  "propertyAddress": <string or null>,
  "propertyCity": <string or null>,
  "propertyState": <2-letter state code or null>,
  "summary": <1-2 sentence deal summary>
}

If not found, use null. Return only valid JSON.`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: extractPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0,
        });
        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        extractedData = { ...extractedData, ...parsed };
      } catch (aiErr) {
        console.warn('[DealIntakeAgent] OpenAI extraction failed, using defaults:', aiErr);
      }
    }

    // ── Step 3: Program Matcher ───────────────────────────────────────────
    const allPrograms = await db.select().from(loanPrograms)
      .where(eq(loanPrograms.isActive, true));

    const matchedPrograms = allPrograms.filter(prog => {
      // Amount range check
      if (extractedData.loanAmount) {
        if (prog.minLoanAmount && extractedData.loanAmount < prog.minLoanAmount) return false;
        if (prog.maxLoanAmount && extractedData.loanAmount > prog.maxLoanAmount) return false;
      }
      // Property type check
      if (extractedData.propertyType && prog.eligiblePropertyTypes && prog.eligiblePropertyTypes.length > 0) {
        const normalized = extractedData.propertyType.toLowerCase();
        const eligible = (prog.eligiblePropertyTypes as string[]).map(t => t.toLowerCase());
        if (!eligible.some(t => t.includes(normalized) || normalized.includes(t))) return false;
      }
      return true;
    });

    // ── Step 4: Document Requirements Builder ────────────────────────────
    let docList: string[] = [];

    if (matchedPrograms.length > 0) {
      const programIds = matchedPrograms.map(p => p.id);
      const templates: any[] = [];
      for (const pid of programIds) {
        const docs = await db.select().from(programDocumentTemplates)
          .where(eq(programDocumentTemplates.programId, pid));
        templates.push(...docs);
      }
      // Deduplicate by document name
      const seen = new Set<string>();
      for (const t of templates) {
        const key = t.documentName.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          docList.push(t.documentName);
        }
      }
    }

    if (docList.length === 0) {
      docList = STANDARD_COMMERCIAL_DOCS;
    }

    // ── Step 5: Email Composer (OpenAI) ──────────────────────────────────
    const brokerEmail = extractedData.brokerEmail || thread.fromAddress;
    const brokerName = extractedData.brokerName || thread.fromName || 'Broker';
    const programNames = matchedPrograms.length > 0
      ? matchedPrograms.map(p => p.name).join(', ')
      : 'our standard commercial lending program';

    const dealSummary = extractedData.summary || `Commercial deal submission from ${brokerName}`;

    let emailHtml = buildDefaultEmailHtml(brokerName, dealSummary, programNames, docList, matchedPrograms.length > 0);

    if (openai) {
      const composePrompt = `You are the Sphinx Capital AI Assistant. Draft a professional HTML email to a commercial real estate broker confirming deal receipt and requesting documents.

Context:
- Broker Name: ${brokerName}
- Deal Summary: ${dealSummary}
- Matched Programs: ${programNames}
- Required Documents: ${docList.join(', ')}

Requirements:
- Warm, professional tone
- Clearly state this is an automated response from the Sphinx Capital AI Assistant
- List all required documents as an HTML ordered list
- Mention the matched program(s) or generic checklist if none matched
- Ask broker to reply with questions or submit documents via the portal
- Close with "Sphinx Capital AI Assistant" signature
- Return only valid HTML for the email body (no <html>/<body> wrapper needed)`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: composePrompt }],
          temperature: 0.3,
        });
        emailHtml = completion.choices[0].message.content || emailHtml;
      } catch (aiErr) {
        console.warn('[DealIntakeAgent] OpenAI email compose failed, using default template:', aiErr);
      }
    }

    // ── Step 6: Send via Gmail ────────────────────────────────────────────
    let emailSent = false;
    const emailSubject = `Re: ${thread.subject || 'Your Commercial Deal Submission'} — Document Request from Sphinx Capital`;

    if (brokerEmail) {
      try {
        await sendNewEmail(account.id, brokerEmail, emailSubject, emailHtml);
        emailSent = true;
        console.log(`[DealIntakeAgent] Email sent to ${brokerEmail} for submission ${submissionId}`);
      } catch (sendErr) {
        console.error('[DealIntakeAgent] Failed to send email:', sendErr);
      }
    }

    // ── Step 7: Submission Autofill ───────────────────────────────────────
    const updateFields: Partial<typeof commercialSubmissions.$inferInsert> = {
      status: 'ai_processing_complete',
    };

    if (extractedData.loanAmount) updateFields.requestedLoanAmount = extractedData.loanAmount;
    if (extractedData.propertyType) updateFields.propertyType = extractedData.propertyType;
    if (extractedData.brokerName) updateFields.brokerOrDeveloperName = extractedData.brokerName;
    if (extractedData.brokerEmail) updateFields.email = extractedData.brokerEmail;
    if (extractedData.propertyAddress) updateFields.propertyAddress = extractedData.propertyAddress;
    if (extractedData.propertyCity) updateFields.city = extractedData.propertyCity;
    if (extractedData.propertyState) updateFields.state = extractedData.propertyState;
    if (extractedData.borrowerName) updateFields.primarySponsorName = extractedData.borrowerName;
    if (extractedData.dealType) {
      updateFields.loanPurpose = extractedData.dealType;
    }

    await db.update(commercialSubmissions)
      .set(updateFields)
      .where(eq(commercialSubmissions.id, submissionId));

    // Update pipeline run to completed
    if (pipelineRunId) {
      await db.update(agentPipelineRuns).set({
        status: 'completed',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date(),
        currentAgentIndex: 5,
      }).where(eq(agentPipelineRuns.id, pipelineRunId));
    }

    console.log(`[DealIntakeAgent] Completed for submission ${submissionId} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      submissionId,
      pipelineRunId,
      brokerEmail: brokerEmail || undefined,
      emailSent,
      extractedData,
      matchedPrograms: matchedPrograms.map(p => ({ id: p.id, name: p.name })),
    };

  } catch (error: any) {
    console.error(`[DealIntakeAgent] Error for submission ${submissionId}:`, error);

    if (pipelineRunId) {
      await db.update(agentPipelineRuns).set({
        status: 'failed',
        errorMessage: error.message,
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date(),
      }).where(eq(agentPipelineRuns.id, pipelineRunId)).catch(() => {});
    }

    // Mark submission as failed intake so UI can show error state
    await db.update(commercialSubmissions).set({ status: 'email_intake_error' })
      .where(eq(commercialSubmissions.id, submissionId)).catch(() => {});

    return {
      success: false,
      submissionId,
      pipelineRunId,
      emailSent: false,
      error: error.message,
    };
  }
}

function buildDefaultEmailHtml(
  brokerName: string,
  dealSummary: string,
  programNames: string,
  docList: string[],
  programMatched: boolean,
): string {
  const docsHtml = docList.map(d => `<li>${d}</li>`).join('\n');
  const programNote = programMatched
    ? `Based on the deal details, this may qualify under: <strong>${programNames}</strong>.`
    : `We will evaluate this against our standard commercial lending programs.`;

  return `
<p>Dear ${brokerName},</p>

<p>Thank you for your submission to Sphinx Capital. This is an automated confirmation generated by the <strong>Sphinx Capital AI Assistant</strong>.</p>

<p>We have received your deal submission: <em>${dealSummary}</em></p>

<p>${programNote}</p>

<p>To move forward with our review, please provide the following documents:</p>

<ol>
${docsHtml}
</ol>

<p>Please reply to this email or submit your documents via the Sphinx Capital portal. A member of our team will follow up once documents are received.</p>

<p><em>This message was generated automatically by the Sphinx Capital AI Assistant. If you have questions, please reply directly to this email.</em></p>

<p>Best regards,<br/>
<strong>Sphinx Capital AI Assistant</strong><br/>
Sphinx Capital</p>
`.trim();
}
