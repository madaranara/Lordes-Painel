import React, { useState } from 'react';
import { HelpCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  plainHint?: string;
  value: string;
  deltaPct?: number;
  invertDeltaColor?: boolean;
  formula: string;
  question: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  plainHint,
  value,
  deltaPct,
  invertDeltaColor = false,
  formula,
  question,
  tone = 'neutral',
}) => {
  const [openInfo, setOpenInfo] = useState(false);

  const valueColor =
    tone === 'positive'
      ? 'text-emerald-700'
      : tone === 'negative'
        ? 'text-rose-700'
        : tone === 'warning'
          ? 'text-amber-700'
          : 'text-slate-900';

  const hasDelta = typeof deltaPct === 'number' && Number.isFinite(deltaPct);
  const isUp = (deltaPct ?? 0) >= 0;
  const deltaPositiveTone = invertDeltaColor ? !isUp : isUp;

  return (
    <div className="relative bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-600 truncate">{title}</div>
          {plainHint && <div className="text-[11px] text-slate-400 truncate mt-0.5">{plainHint}</div>}
        </div>
        <button
          type="button"
          onClick={() => setOpenInfo((v) => !v)}
          aria-label={`Ver fórmula de ${title}`}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors shrink-0"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className={`text-xl font-semibold tracking-tight font-mono-num ${valueColor}`}>
          {value}
        </div>
        {hasDelta && (
          <div
            className={`inline-flex items-center gap-0.5 text-[11px] font-medium font-mono-num shrink-0 ${
              deltaPositiveTone ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(deltaPct!).toFixed(1).replace('.', ',')}%
          </div>
        )}
      </div>

      {openInfo && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
          <div>
            <span className="font-semibold text-slate-800">Pergunta:</span> {question}
          </div>
          <div>
            <span className="font-semibold text-slate-800">Fórmula:</span>{' '}
            <span className="font-mono text-[11px] text-slate-700">{formula}</span>
          </div>
        </div>
      )}
    </div>
  );
};
