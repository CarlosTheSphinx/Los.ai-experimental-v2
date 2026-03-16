import { Router, type Request, type Response } from 'express';
import { executeAgent, type AgentType } from '../agents/agentRunner';
import { OrchestrationTracer } from '../services/orchestrationTracing';
import { db } from '../db';
import { agentConfigurations } from '@shared/schema';
import { eq } from 'drizzle-orm';

const AGENT_SEQUENCE: AgentType[] = ['document_intelligence', 'processor', 'communication'];

export function registerDebuggerRoutes(app: any, deps: { authenticateUser: any; requireSuperAdmin: any }) {
  app.post('/api/debug/replay-agent', deps.authenticateUser, deps.requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { agentName, input, customPrompt, replayMode } = req.body;

      if (!agentName || !input) {
        return res.status(400).json({ success: false, error: 'agentName and input are required' });
      }

      const sessionId = OrchestrationTracer.startSession();

      if (replayMode === 'isolated') {
        const result = await OrchestrationTracer.traceAgent(
          agentName,
          AGENT_SEQUENCE.indexOf(agentName as AgentType),
          input,
          () => executeAgent({
            agentType: agentName as AgentType,
            projectId: input.projectId || 0,
            triggerType: 'debug_replay',
            contextData: input,
          }),
          customPrompt,
          sessionId
        );

        return res.json({ success: true, result, sessionId });
      } else if (replayMode === 'cascade') {
        const startIndex = AGENT_SEQUENCE.indexOf(agentName as AgentType);
        if (startIndex === -1) {
          return res.status(400).json({ success: false, error: `Unknown agent: ${agentName}` });
        }

        const results: Record<string, any> = {};
        let currentInput = { ...input };

        for (let i = startIndex; i < AGENT_SEQUENCE.length; i++) {
          const agent = AGENT_SEQUENCE[i];
          const result = await OrchestrationTracer.traceAgent(
            agent,
            i,
            currentInput,
            () => executeAgent({
              agentType: agent,
              projectId: input.projectId || 0,
              triggerType: 'debug_replay',
              contextData: currentInput,
            }),
            i === startIndex ? customPrompt : undefined,
            sessionId
          );

          results[agent] = result;
          if (result && typeof result === 'object') {
            currentInput = { ...currentInput, ...result };
          }
        }

        OrchestrationTracer.emit({
          eventType: 'session_complete',
          agentName: '',
          agentIndex: 0,
          timestamp: new Date().toISOString(),
          sessionId,
        });

        return res.json({ success: true, results, sessionId });
      }

      return res.status(400).json({ success: false, error: 'Invalid replayMode. Use "isolated" or "cascade".' });
    } catch (error: any) {
      console.error('Debug replay error:', error);
      return res.status(500).json({ success: false, error: error?.message || 'Replay failed' });
    }
  });

  app.get('/api/debug/agent-configs', deps.authenticateUser, deps.requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const configs = await db
        .select({
          agentType: agentConfigurations.agentType,
          systemPrompt: agentConfigurations.systemPrompt,
          modelName: agentConfigurations.modelName,
          modelProvider: agentConfigurations.modelProvider,
          temperature: agentConfigurations.temperature,
          maxTokens: agentConfigurations.maxTokens,
        })
        .from(agentConfigurations)
        .where(eq(agentConfigurations.isActive, true));

      return res.json({ success: true, configs });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message });
    }
  });
}
