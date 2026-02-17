/**
 * Pipeline Orchestrator
 * Chains AI agents: Document Intelligence → Processor → Communication
 * Each agent's output feeds as context into the next agent
 */

import { db } from "../db";
import {
  agentPipelineRuns,
  pipelineStepLogs,
  documentExtractions,
  agentFindings,
  agentCommunications,
  dealStories,
  projects,
  type AgentPipelineRun,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { executeAgent, type AgentType } from "./agentRunner";

const DEFAULT_SEQUENCE: AgentType[] = [
  "document_intelligence",
  "processor",
  "communication",
];

/**
 * Start a new pipeline run for a deal
 */
export async function startPipeline(
  projectId: number,
  triggeredBy: number | null,
  triggerType: string = "manual",
  agentSequence: AgentType[] = DEFAULT_SEQUENCE
): Promise<AgentPipelineRun> {
  console.log(`🚀 Starting pipeline for project ${projectId} — sequence: ${agentSequence.join(" → ")}`);

  // Create pipeline run record
  const [pipelineRun] = await db
    .insert(agentPipelineRuns)
    .values({
      projectId,
      status: "running",
      agentSequence: agentSequence as any,
      currentAgentIndex: 0,
      triggerType,
      triggeredBy,
    })
    .returning();

  // Create step log placeholders for each agent in the sequence
  for (let i = 0; i < agentSequence.length; i++) {
    await db.insert(pipelineStepLogs).values({
      pipelineRunId: pipelineRun.id,
      agentType: agentSequence[i],
      sequenceIndex: i,
      status: i === 0 ? "running" : "pending",
      executedAt: i === 0 ? new Date() : null,
    });
  }

  // Kick off the first agent
  try {
    await executeNextAgent(pipelineRun.id, projectId, agentSequence, 0, triggeredBy);
  } catch (error) {
    console.error(`❌ Pipeline failed at agent index 0:`, error);
    await markPipelineFailed(pipelineRun.id, error instanceof Error ? error.message : String(error));
  }

  // Return updated pipeline run
  const [updated] = await db
    .select()
    .from(agentPipelineRuns)
    .where(eq(agentPipelineRuns.id, pipelineRun.id));

  return updated;
}

/**
 * Execute the next agent in the pipeline sequence
 */
async function executeNextAgent(
  pipelineRunId: number,
  projectId: number,
  agentSequence: AgentType[],
  agentIndex: number,
  triggeredBy: number | null
): Promise<void> {
  if (agentIndex >= agentSequence.length) {
    // Pipeline complete
    await markPipelineCompleted(pipelineRunId);
    await compileDealStory(projectId);
    return;
  }

  const agentType = agentSequence[agentIndex];
  console.log(`🔄 Pipeline step ${agentIndex + 1}/${agentSequence.length}: ${agentType}`);

  // Update pipeline current index
  await db
    .update(agentPipelineRuns)
    .set({ currentAgentIndex: agentIndex })
    .where(eq(agentPipelineRuns.id, pipelineRunId));

  // Build context from previous agents' outputs
  const contextData = await compileContextForAgent(projectId, agentType, agentIndex);

  // Get the project info for context
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Merge project info into context
  const fullContext = {
    ...contextData,
    deal_name: project.name || `Deal #${project.id}`,
    borrower_name: (project as any).borrowerName || "Unknown",
    property_address: (project as any).propertyAddress || "N/A",
    loan_type: project.loanType || "N/A",
  };

  try {
    // Execute the agent
    const result = await executeAgent({
      agentType,
      projectId,
      triggeredBy: triggeredBy || undefined,
      triggerType: "pipeline",
      contextData: fullContext,
    });

    // Parse agent response and store structured output
    let outputSummary: any = {};
    try {
      outputSummary = JSON.parse(result.response);
    } catch {
      outputSummary = { raw_response: result.response };
    }

    // Store the output based on agent type
    await storeAgentOutput(agentType, projectId, result.agentRunId, outputSummary);

    // Update step log
    await db
      .update(pipelineStepLogs)
      .set({
        agentRunId: result.agentRunId,
        status: "completed",
        outputSummary,
        inputContext: fullContext,
        durationMs: result.durationMs,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(pipelineStepLogs.pipelineRunId, pipelineRunId),
          eq(pipelineStepLogs.sequenceIndex, agentIndex)
        )
      );

    // Update deal story after each agent step
    await compileDealStory(projectId);

    // Mark next step as running
    if (agentIndex + 1 < agentSequence.length) {
      await db
        .update(pipelineStepLogs)
        .set({ status: "running", executedAt: new Date() })
        .where(
          and(
            eq(pipelineStepLogs.pipelineRunId, pipelineRunId),
            eq(pipelineStepLogs.sequenceIndex, agentIndex + 1)
          )
        );
    }

    // Continue to next agent
    await executeNextAgent(pipelineRunId, projectId, agentSequence, agentIndex + 1, triggeredBy);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Update step log with failure
    await db
      .update(pipelineStepLogs)
      .set({
        status: "failed",
        errorMessage: errorMsg,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(pipelineStepLogs.pipelineRunId, pipelineRunId),
          eq(pipelineStepLogs.sequenceIndex, agentIndex)
        )
      );

    throw error;
  }
}

/**
 * Build context for the current agent from previous agents' outputs
 */
async function compileContextForAgent(
  projectId: number,
  agentType: AgentType,
  agentIndex: number
): Promise<Record<string, any>> {
  const context: Record<string, any> = {};

  if (agentType === "document_intelligence" || agentIndex === 0) {
    // First agent gets basic deal data — no previous agent output
    context.declared_doc_type = "auto_detect";
    context.extracted_text = "[Documents attached to this deal will be analyzed]";
    return context;
  }

  if (agentType === "processor" || agentIndex === 1) {
    // Processor gets document extraction results
    const extractions = await db
      .select()
      .from(documentExtractions)
      .where(eq(documentExtractions.projectId, projectId))
      .orderBy(desc(documentExtractions.createdAt));

    context.document_summaries = extractions
      .map(
        (e) =>
          `Document: ${e.documentType || "Unknown"}\nExtracted: ${JSON.stringify(e.extractedData)}\nConfidence: ${e.confidenceScore}%`
      )
      .join("\n\n---\n\n");

    context.total_documents = extractions.length;
    return context;
  }

  if (agentType === "communication" || agentIndex === 2) {
    // Communication agent gets findings summary
    const findings = await db
      .select()
      .from(agentFindings)
      .where(eq(agentFindings.projectId, projectId))
      .orderBy(desc(agentFindings.createdAt));

    context.findings_summary = findings
      .map(
        (f) =>
          `[${f.severity?.toUpperCase()}] ${f.category}: ${f.title}\n${f.description}`
      )
      .join("\n\n");

    context.communication_type = "status_update";
    context.recipient_name = "Borrower";
    context.recipient_type = "borrower";
    return context;
  }

  return context;
}

/**
 * Store agent output in the appropriate table based on agent type
 */
async function storeAgentOutput(
  agentType: AgentType,
  projectId: number,
  agentRunId: number,
  output: any
): Promise<void> {
  try {
    if (agentType === "document_intelligence") {
      await db.insert(documentExtractions).values({
        projectId,
        agentRunId,
        documentType: output.confirmed_doc_type || "auto_detected",
        extractedData: output.extracted_fields || output,
        confidenceScore: output.confidence_score || 0,
        qualityAssessment: output.quality_assessment || null,
        anomalies: output.anomalies || null,
        recommendations: output.recommendations || null,
      });
    } else if (agentType === "processor") {
      // Store each finding as a separate record
      const keyFindings = output.key_findings || [output];
      for (const finding of Array.isArray(keyFindings) ? keyFindings : [keyFindings]) {
        await db.insert(agentFindings).values({
          projectId,
          agentRunId,
          category: finding.category || "general",
          title: finding.title || finding.finding || "Finding",
          description: finding.description || finding.detail || JSON.stringify(finding),
          severity: finding.severity || output.risk_assessment?.level || "info",
          data: finding,
        });
      }
    } else if (agentType === "communication") {
      await db.insert(agentCommunications).values({
        projectId,
        agentRunId,
        communicationType: output.tone || "status_update",
        recipientType: "borrower",
        subject: output.subject || "Deal Update",
        body: output.body || output.raw_response || "",
        status: "draft",
      });
    }
  } catch (error) {
    console.error(`⚠️ Failed to store ${agentType} output:`, error);
    // Don't throw — output storage failure shouldn't kill the pipeline
  }
}

/**
 * Compile or update the Deal Story from all agent outputs
 */
async function compileDealStory(projectId: number): Promise<void> {
  try {
    const extractions = await db
      .select()
      .from(documentExtractions)
      .where(eq(documentExtractions.projectId, projectId));

    const findings = await db
      .select()
      .from(agentFindings)
      .where(eq(agentFindings.projectId, projectId));

    const communications = await db
      .select()
      .from(agentCommunications)
      .where(eq(agentCommunications.projectId, projectId));

    // Build narrative sections
    const sections: string[] = [];

    if (extractions.length > 0) {
      sections.push(
        `## Documents Analyzed\n${extractions.length} document(s) processed. ` +
          extractions
            .map((e) => `- ${e.documentType}: Confidence ${e.confidenceScore}%`)
            .join("\n")
      );
    }

    if (findings.length > 0) {
      const critical = findings.filter((f) => f.severity === "critical").length;
      const warnings = findings.filter((f) => f.severity === "warning").length;
      sections.push(
        `## Processor Findings\n${findings.length} finding(s): ${critical} critical, ${warnings} warnings.\n` +
          findings.map((f) => `- [${f.severity}] ${f.title}: ${f.description}`).join("\n")
      );
    }

    if (communications.length > 0) {
      sections.push(
        `## Drafted Communications\n${communications.length} draft(s) pending review.`
      );
    }

    const narrative =
      sections.length > 0
        ? sections.join("\n\n")
        : "No AI analysis has been run on this deal yet.";

    // Upsert deal story
    const [existing] = await db
      .select()
      .from(dealStories)
      .where(eq(dealStories.projectId, projectId));

    if (existing) {
      await db
        .update(dealStories)
        .set({
          currentNarrative: narrative,
          lastAgentUpdate: new Date(),
          storyVersion: existing.storyVersion + 1,
          metadata: {
            total_extractions: extractions.length,
            total_findings: findings.length,
            total_communications: communications.length,
          },
          updatedAt: new Date(),
        })
        .where(eq(dealStories.projectId, projectId));
    } else {
      await db.insert(dealStories).values({
        projectId,
        currentNarrative: narrative,
        lastAgentUpdate: new Date(),
        metadata: {
          total_extractions: extractions.length,
          total_findings: findings.length,
          total_communications: communications.length,
        },
      });
    }

    console.log(`📖 Deal story updated for project ${projectId}`);
  } catch (error) {
    console.error(`⚠️ Failed to compile deal story:`, error);
  }
}

/**
 * Mark pipeline as completed
 */
async function markPipelineCompleted(pipelineRunId: number): Promise<void> {
  const [run] = await db
    .select()
    .from(agentPipelineRuns)
    .where(eq(agentPipelineRuns.id, pipelineRunId));

  const totalDurationMs = run?.startedAt
    ? Date.now() - new Date(run.startedAt).getTime()
    : 0;

  await db
    .update(agentPipelineRuns)
    .set({
      status: "completed",
      completedAt: new Date(),
      totalDurationMs,
    })
    .where(eq(agentPipelineRuns.id, pipelineRunId));

  console.log(`✅ Pipeline ${pipelineRunId} completed in ${totalDurationMs}ms`);
}

/**
 * Mark pipeline as failed
 */
async function markPipelineFailed(
  pipelineRunId: number,
  errorMessage: string
): Promise<void> {
  await db
    .update(agentPipelineRuns)
    .set({
      status: "failed",
      errorMessage,
      completedAt: new Date(),
    })
    .where(eq(agentPipelineRuns.id, pipelineRunId));

  console.log(`❌ Pipeline ${pipelineRunId} failed: ${errorMessage}`);
}

/**
 * Get pipeline status for a project
 */
export async function getPipelineStatus(projectId: number) {
  const latestRun = await db
    .select()
    .from(agentPipelineRuns)
    .where(eq(agentPipelineRuns.projectId, projectId))
    .orderBy(desc(agentPipelineRuns.startedAt))
    .limit(1)
    .then((rows) => rows[0]);

  if (!latestRun) {
    return { hasRun: false, latestRun: null, steps: [] };
  }

  const steps = await db
    .select()
    .from(pipelineStepLogs)
    .where(eq(pipelineStepLogs.pipelineRunId, latestRun.id))
    .orderBy(pipelineStepLogs.sequenceIndex);

  return { hasRun: true, latestRun, steps };
}

/**
 * Get all pipeline runs for a project
 */
export async function getPipelineHistory(projectId: number, limit = 10) {
  const runs = await db
    .select()
    .from(agentPipelineRuns)
    .where(eq(agentPipelineRuns.projectId, projectId))
    .orderBy(desc(agentPipelineRuns.startedAt))
    .limit(limit);

  return runs;
}
