import { motion } from 'framer-motion';
import type { OrchestrationSession } from '@/types/orchestration';

const AGENT_COLORS: Record<string, string> = {
  document_intelligence: 'bg-purple-900/80',
  processor: 'bg-blue-900/80',
  communication: 'bg-amber-900/80',
  creditExtractor: 'bg-emerald-900/80',
};

const AGENT_LABELS: Record<string, string> = {
  document_intelligence: 'Document Intelligence',
  processor: 'Processor',
  communication: 'Communication',
  creditExtractor: 'Credit Extractor',
};

interface AgentTracePanelProps {
  session: OrchestrationSession;
  selectedAgent: string | null;
  onSelectAgent: (agentName: string) => void;
}

export function AgentTracePanel({ session, selectedAgent, onSelectAgent }: AgentTracePanelProps) {
  const agents = Array.from(
    new Map(
      session.events
        .filter(e => e.agentName && e.agentName !== '')
        .map(e => [e.agentName, {
          name: e.agentName,
          index: e.agentIndex,
          status: e.eventType,
          duration: e.duration,
          tokens: e.tokens,
          metadata: e.metadata,
        }])
    ).values()
  );

  if (agents.length === 0) {
    return (
      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Agent Flow</p>
        <p className="text-[13px] text-slate-500 italic">Waiting for events...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Agent Flow</p>
      <div className="space-y-1.5">
        {agents.map((agent, idx) => {
          const isActive = session.currentAgent === agent.name;
          const isSelected = selectedAgent === agent.name;
          const hasError = session.events.some(
            e => e.agentName === agent.name && e.eventType === 'agent_error'
          );
          const isComplete = session.events.some(
            e => e.agentName === agent.name && e.eventType === 'agent_complete'
          );

          return (
            <motion.button
              key={agent.name}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectAgent(agent.name)}
              className={`w-full p-2.5 rounded-md text-left text-[13px] font-medium transition-all ${
                AGENT_COLORS[agent.name] || 'bg-slate-700/60'
              } ${isSelected ? 'ring-2 ring-cyan-400/70' : ''} ${
                hasError ? 'ring-2 ring-red-500/70' : ''
              }`}
              data-testid={`debugger-agent-${agent.name}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300/80 text-[11px] font-mono">{idx + 1}.</span>
                  <span className="text-white/90">{AGENT_LABELS[agent.name] || agent.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {agent.duration && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(agent.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                  {isActive && <span className="animate-pulse text-cyan-400 text-[10px]">●</span>}
                  {isComplete && <span className="text-green-400 text-[10px]">✓</span>}
                  {hasError && <span className="text-red-400 text-[10px]">✕</span>}
                </div>
              </div>
              {agent.tokens && (
                <div className="mt-1 text-[10px] text-slate-400/70 font-mono">
                  {agent.tokens.input} in / {agent.tokens.output} out tokens
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
