import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, ChevronRight, FileText, Copy, Check } from 'lucide-react';

interface PromptEditorProps {
  agentName: string;
  currentPrompt?: string;
  input?: Record<string, any>;
  isCreditExtraction?: boolean;
  onReplay: (customPrompt: string, mode: 'isolated' | 'cascade') => Promise<any>;
}

export function PromptEditor({ agentName, currentPrompt, input, isCreditExtraction, onReplay }: PromptEditorProps) {
  const [prompt, setPrompt] = useState(currentPrompt || '');
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentPrompt && !prompt) {
      setPrompt(currentPrompt);
    }
  }, [currentPrompt]);

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

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const agentLabel = {
    creditPolicyExtractor: 'Credit Policy Extractor',
    document_intelligence: 'Document Intelligence',
    processor: 'Processor',
    communication: 'Communication',
  }[agentName] || agentName;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-800/60 rounded-lg border border-slate-700/50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-cyan-400" />
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            System Prompt — {agentLabel}
          </p>
        </div>
        <button
          onClick={handleCopyPrompt}
          className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          title="Copy prompt"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="p-3 space-y-2">
        {input && (
          <div className="bg-slate-900/50 rounded p-2 mb-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Input Context</p>
            <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap max-h-[60px] overflow-auto">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
        )}

        <div>
          <p className="text-[10px] text-slate-500 mb-1">
            {isCreditExtraction
              ? 'Edit the system prompt below and re-run extraction on the same document:'
              : 'Edit the system prompt and replay this agent:'}
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-40 bg-slate-900/80 text-[12px] text-slate-200 font-mono p-2 rounded border border-slate-600/50 resize-y outline-none focus:border-cyan-500/50 transition-colors"
            placeholder="Enter custom system prompt..."
            data-testid="debugger-prompt-editor"
          />
        </div>

        {isCreditExtraction ? (
          <Button
            size="sm"
            onClick={() => handleReplay('isolated')}
            disabled={replaying || !prompt.trim()}
            className="w-full h-8 text-[11px] bg-teal-700/80 hover:bg-teal-600/80 text-white border-0"
            data-testid="debugger-replay-credit"
          >
            <Play className="h-3 w-3 mr-1.5" />
            {replaying ? 'Re-running extraction...' : 'Re-run with Modified Prompt'}
          </Button>
        ) : (
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
        )}

        {currentPrompt && prompt !== currentPrompt && (
          <button
            onClick={() => setPrompt(currentPrompt)}
            className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-1"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Reset to original prompt
          </button>
        )}

        {replayResult && (
          <details open className="mt-2">
            <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-300 font-medium">
              {replayResult.error ? '⚠ Replay Error' : `✓ Replay Result${replayResult.rules ? ` (${replayResult.rules.length} rules)` : ''}`}
            </summary>
            <pre className="mt-1 text-[10px] text-slate-300 bg-slate-900/50 rounded p-2 max-h-[200px] overflow-auto whitespace-pre-wrap font-mono">
              {JSON.stringify(replayResult, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </motion.div>
  );
}
