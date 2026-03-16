import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, ChevronRight } from 'lucide-react';

interface PromptEditorProps {
  agentName: string;
  currentPrompt?: string;
  input?: Record<string, any>;
  onReplay: (customPrompt: string, mode: 'isolated' | 'cascade') => Promise<any>;
}

export function PromptEditor({ agentName, currentPrompt, input, onReplay }: PromptEditorProps) {
  const [prompt, setPrompt] = useState(currentPrompt || '');
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<any>(null);

  const handleReplay = async (mode: 'isolated' | 'cascade') => {
    setReplaying(true);
    setReplayResult(null);
    try {
      const result = await onReplay(prompt, mode);
      setReplayResult(result);
    } catch (err: any) {
      setReplayResult({ error: err.message });
    } finally {
      setReplaying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-800/60 rounded-lg border border-slate-700/50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Prompt Editor — {agentName}
        </p>
      </div>

      <div className="p-3 space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-32 bg-slate-900/80 text-[12px] text-slate-200 font-mono p-2 rounded border border-slate-600/50 resize-y outline-none focus:border-cyan-500/50 transition-colors"
          placeholder="Enter custom system prompt..."
          data-testid="debugger-prompt-editor"
        />

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReplay('isolated')}
            disabled={replaying || !prompt.trim()}
            className="flex-1 h-7 text-[11px] bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50"
            data-testid="debugger-replay-isolated"
          >
            <Play className="h-3 w-3 mr-1" />
            {replaying ? 'Running...' : 'Replay Isolated'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReplay('cascade')}
            disabled={replaying || !prompt.trim()}
            className="flex-1 h-7 text-[11px] bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50"
            data-testid="debugger-replay-cascade"
          >
            <ChevronRight className="h-3 w-3 mr-1" />
            {replaying ? 'Running...' : 'Replay Cascade'}
          </Button>
        </div>

        {currentPrompt && (
          <button
            onClick={() => setPrompt(currentPrompt)}
            className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-1"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Reset to original
          </button>
        )}

        {replayResult && (
          <details open className="mt-2">
            <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-300">
              Replay Result
            </summary>
            <pre className="mt-1 text-[10px] text-slate-300 bg-slate-900/50 rounded p-2 max-h-[120px] overflow-auto whitespace-pre-wrap">
              {JSON.stringify(replayResult, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </motion.div>
  );
}
