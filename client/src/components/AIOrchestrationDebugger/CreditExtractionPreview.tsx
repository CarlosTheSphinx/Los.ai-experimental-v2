import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { OrchestrationSession, CreditRule } from '@/types/orchestration';

interface CreditExtractionPreviewProps {
  session: OrchestrationSession;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'bg-green-500/20 text-green-300 border-green-500/30';
  if (confidence >= 0.7) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-red-500/20 text-red-300 border-red-500/30';
}

const CATEGORY_COLORS: Record<string, string> = {
  base_rates: 'bg-blue-500/20 text-blue-300',
  adjusters: 'bg-purple-500/20 text-purple-300',
  leverage_caps: 'bg-amber-500/20 text-amber-300',
  eligibility: 'bg-red-500/20 text-red-300',
  overlays: 'bg-cyan-500/20 text-cyan-300',
  points: 'bg-green-500/20 text-green-300',
};

export function CreditExtractionPreview({ session }: CreditExtractionPreviewProps) {
  const extractionEvents = session.events.filter(
    e => e.eventType === 'credit_rule_extracted' || e.eventType === 'credit_extraction_batch'
  );

  const allRules: CreditRule[] = extractionEvents
    .flatMap(e => e.rules || [])
    .filter((rule, idx, arr) => arr.findIndex(r => r.id === rule.id) === idx);

  const latestProgress = [...extractionEvents]
    .reverse()
    .find(e => e.progress)?.progress;

  if (extractionEvents.length === 0) return null;

  return (
    <div className="bg-slate-800/60 rounded-lg border border-slate-700/50">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Credit Rules Extraction
        </p>
        {latestProgress && (
          <span className="text-[10px] text-cyan-400 font-mono">
            {latestProgress.current}/{latestProgress.total} ({Math.round(latestProgress.percentage)}%)
          </span>
        )}
      </div>

      {latestProgress && (
        <div className="px-3 pt-2">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${latestProgress.percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <div className="p-2 max-h-[250px] overflow-y-auto space-y-1">
        <AnimatePresence initial={false}>
          {allRules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-900/50 rounded p-2 border border-slate-700/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-slate-200 flex-1">{rule.rule}</p>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 flex-shrink-0 border ${getConfidenceColor(rule.confidence)}`}
                >
                  {Math.round(rule.confidence * 100)}%
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge
                  variant="secondary"
                  className={`text-[9px] px-1.5 py-0 h-4 ${CATEGORY_COLORS[rule.category] || 'bg-slate-600/50 text-slate-400'}`}
                >
                  {rule.category}
                </Badge>
                {rule.reasoning && (
                  <span className="text-[9px] text-slate-500 truncate">{rule.reasoning}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
