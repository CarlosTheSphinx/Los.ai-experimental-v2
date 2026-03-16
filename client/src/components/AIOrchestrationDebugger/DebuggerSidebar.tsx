import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOrchestrationEvents } from '@/hooks/useOrchestrationEvents';
import { AgentTracePanel } from './AgentTracePanel';
import { RealTimeOutput } from './RealTimeOutput';
import { PromptEditor } from './PromptEditor';
import { CreditExtractionPreview } from './CreditExtractionPreview';
import type { OrchestrationEvent, OrchestrationSession } from '@/types/orchestration';
import { X, Bug, Wifi, WifiOff, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TabType = 'sessions' | 'log';

export function AIOrchestrationDebugger() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<OrchestrationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [allEvents, setAllEvents] = useState<OrchestrationEvent[]>([]);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const handleEvent = useCallback((event: OrchestrationEvent) => {
    setAllEvents(prev => [...prev.slice(-500), event]);

    if (!isOpenRef.current && (event.eventType === 'session_start' || event.eventType === 'agent_start')) {
      setHasNewActivity(true);
    }

    setSessions(prev => {
      const existing = prev.find(s => s.sessionId === event.sessionId);

      if (!existing) {
        const newSession: OrchestrationSession = {
          sessionId: event.sessionId,
          startTime: new Date(event.timestamp),
          events: [event],
          currentAgent: event.agentName || undefined,
          status: 'running',
        };
        setActiveSessionId(event.sessionId);
        return [newSession, ...prev].slice(0, 20);
      }

      return prev.map(session => {
        if (session.sessionId !== event.sessionId) return session;

        let status = session.status;
        if (event.eventType === 'agent_error') status = 'error';
        else if (event.eventType === 'session_complete') status = 'completed';

        return {
          ...session,
          events: [...session.events, event],
          currentAgent: event.agentName || session.currentAgent,
          status,
        };
      });
    });
  }, []);

  const { connected, replayAgent } = useOrchestrationEvents(handleEvent);

  const activeSession = sessions.find(s => s.sessionId === activeSessionId);

  const clearSessions = () => {
    setSessions([]);
    setActiveSessionId(null);
    setSelectedAgent(null);
    setAllEvents([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setHasNewActivity(false); }}
        className={`fixed bottom-6 left-6 z-[60] h-10 px-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 border text-[12px] font-medium ${
          hasNewActivity
            ? 'bg-cyan-600 text-white border-cyan-400/50 animate-pulse'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-600/50'
        }`}
        title="AI Orchestration Debugger"
        data-testid="debugger-toggle"
      >
        <Bug className="h-4 w-4" />
        <span>{hasNewActivity ? 'AI Active' : 'AI Debugger'}</span>
        {connected && <span className="h-1.5 w-1.5 rounded-full bg-green-400" />}
        {hasNewActivity && <span className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" />}
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 h-screen w-[380px] bg-slate-900 border-r border-slate-700/80 shadow-2xl flex flex-col z-[60]"
        data-testid="debugger-sidebar"
      >
        <div className="bg-slate-800/80 border-b border-slate-700/50 px-4 py-3 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-cyan-400" />
            <h2 className="text-[14px] font-semibold text-white">AI Debugger</h2>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={clearSessions}
              title="Clear all sessions"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={() => setIsOpen(false)}
              data-testid="debugger-close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
          <button
            className={`flex-1 px-4 py-2 text-[12px] font-medium transition-colors ${
              activeTab === 'sessions'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            Sessions ({sessions.length})
          </button>
          <button
            className={`flex-1 px-4 py-2 text-[12px] font-medium transition-colors ${
              activeTab === 'log'
                ? 'text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('log')}
          >
            Log ({allEvents.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {activeTab === 'log' ? (
            <RealTimeOutput events={allEvents} selectedAgent={null} />
          ) : activeSession ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                {sessions.length > 1 && (
                  <select
                    value={activeSessionId || ''}
                    onChange={(e) => {
                      setActiveSessionId(e.target.value);
                      setSelectedAgent(null);
                    }}
                    className="flex-1 bg-slate-800 text-[11px] text-slate-300 rounded border border-slate-600/50 px-2 py-1 outline-none"
                  >
                    {sessions.map(s => (
                      <option key={s.sessionId} value={s.sessionId}>
                        {s.sessionId.slice(0, 8)}... — {s.status}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {activeSession.startTime.toLocaleTimeString()}
                </div>
              </div>

              <AgentTracePanel
                session={activeSession}
                selectedAgent={selectedAgent}
                onSelectAgent={(name) =>
                  setSelectedAgent(prev => prev === name ? null : name)
                }
              />

              <RealTimeOutput events={activeSession.events} selectedAgent={selectedAgent} />

              <AnimatePresence>
                {selectedAgent && (
                  <PromptEditor
                    agentName={selectedAgent}
                    currentPrompt={
                      activeSession.events.find(
                        e => e.agentName === selectedAgent && e.prompt
                      )?.prompt
                    }
                    input={
                      activeSession.events.find(
                        e => e.agentName === selectedAgent && e.eventType === 'agent_start'
                      )?.input
                    }
                    onReplay={(customPrompt, mode) =>
                      replayAgent(
                        selectedAgent,
                        activeSession.events.find(e => e.agentName === selectedAgent)?.input || {},
                        customPrompt,
                        mode
                      )
                    }
                  />
                )}
              </AnimatePresence>

              {activeSession.events.some(
                e => e.eventType === 'credit_rule_extracted' || e.eventType === 'credit_extraction_batch'
              ) && (
                <CreditExtractionPreview session={activeSession} />
              )}
            </>
          ) : (
            <div className="text-slate-500 text-center py-12">
              <Bug className="h-8 w-8 mx-auto mb-3 text-slate-600" />
              <p className="text-[13px]">No active sessions</p>
              <p className="text-[11px] mt-1 text-slate-600">
                Run AI orchestration to see events stream here in real-time.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
