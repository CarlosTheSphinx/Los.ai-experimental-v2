import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
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
  Eligibility: 'bg-red-500/20 text-red-300',
  Credit: 'bg-blue-500/20 text-blue-300',
  Income: 'bg-green-500/20 text-green-300',
  Property: 'bg-amber-500/20 text-amber-300',
  Financial: 'bg-purple-500/20 text-purple-300',
  Insurance: 'bg-cyan-500/20 text-cyan-300',
  Title: 'bg-indigo-500/20 text-indigo-300',
  Flood: 'bg-sky-500/20 text-sky-300',
  Escrow: 'bg-teal-500/20 text-teal-300',
  Management: 'bg-orange-500/20 text-orange-300',
  Borrower: 'bg-pink-500/20 text-pink-300',
  Guarantor: 'bg-rose-500/20 text-rose-300',
  Documentation: 'bg-slate-500/20 text-slate-300',
  Reserves: 'bg-emerald-500/20 text-emerald-300',
  Location: 'bg-violet-500/20 text-violet-300',
  LTV: 'bg-lime-500/20 text-lime-300',
  DSCR: 'bg-yellow-500/20 text-yellow-300',
  Compliance: 'bg-fuchsia-500/20 text-fuchsia-300',
};

export function CreditExtractionPreview({ session }: CreditExtractionPreviewProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

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

  const categoryCounts = allRules.reduce((acc, r) => {
    const cat = r.category || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredRules = filterCategory
    ? allRules.filter(r => (r.category || 'General') === filterCategory)
    : allRules;

  const clarificationCount = allRules.filter(r => r.clarificationNeeded).length;

  return (
    <div className="bg-slate-800/60 rounded-lg border border-slate-700/50">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Credit Rules Extraction
        </p>
        <div className="flex items-center gap-2">
          {clarificationCount > 0 && (
            <span className="text-[10px] text-amber-400 flex items-center gap-0.5" title={`${clarificationCount} rules need clarification`}>
              <AlertTriangle className="h-3 w-3" />
              {clarificationCount}
            </span>
          )}
          {latestProgress && (
            <span className="text-[10px] text-cyan-400 font-mono">
              {latestProgress.current}/{latestProgress.total} ({Math.round(latestProgress.percentage)}%)
            </span>
          )}
        </div>
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

      {Object.keys(categoryCounts).length > 1 && (
        <div className="px-2 pt-2 flex flex-wrap gap-1">
          <button
            onClick={() => setFilterCategory(null)}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${!filterCategory ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-700/50 text-slate-400 hover:text-slate-300'}`}
          >
            All ({allRules.length})
          </button>
          {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${filterCategory === cat ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-700/50 text-slate-400 hover:text-slate-300'}`}
            >
              {cat} ({count})
            </button>
          ))}
        </div>
      )}

      <div className="p-2 max-h-[350px] overflow-y-auto space-y-1">
        <AnimatePresence initial={false}>
          {filteredRules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.5) }}
              className={`bg-slate-900/50 rounded p-2 border cursor-pointer transition-colors ${
                rule.clarificationNeeded
                  ? 'border-amber-500/30 hover:border-amber-500/50'
                  : 'border-slate-700/30 hover:border-slate-600/50'
              }`}
              onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-slate-200 flex-1">
                  {rule.clarificationNeeded && <AlertTriangle className="h-3 w-3 text-amber-400 inline mr-1 -mt-0.5" />}
                  {rule.rule}
                </p>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 flex-shrink-0 border ${getConfidenceColor(rule.confidence)}`}
                >
                  {Math.round(rule.confidence * 100)}%
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge
                  variant="secondary"
                  className={`text-[9px] px-1.5 py-0 h-4 ${CATEGORY_COLORS[rule.category] || 'bg-slate-600/50 text-slate-400'}`}
                >
                  {rule.category}
                </Badge>
                {rule.documentType && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-slate-600/30 text-slate-400">
                    {rule.documentType}
                  </Badge>
                )}
                {rule.ruleType && (
                  <span className="text-[9px] text-slate-500">{rule.ruleType.replace(/_/g, ' ')}</span>
                )}
              </div>

              <AnimatePresence>
                {expandedRule === rule.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-slate-700/30 space-y-1"
                  >
                    {rule.reasoning && (
                      <p className="text-[10px] text-slate-300">{rule.reasoning}</p>
                    )}
                    {rule.sourceSection && (
                      <p className="text-[9px] text-slate-500">
                        <span className="text-slate-400 font-medium">Source:</span> {rule.sourceSection}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
