import React, { useState } from 'react';
import { formatBRL, formatCompactBRL } from '../utils/formatters';
import { CashFlowPoint } from '../utils/kpiEngine';

interface RevExpPoint {
  label: string;
  receitasCents: number;
  despesasCents: number;
}

export const RevenueExpenseChart: React.FC<{ data: RevExpPoint[]; accentColor: string }> = ({
  data,
  accentColor,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const maxVal = Math.max(
    100000,
    ...data.flatMap((d) => [d.receitasCents, d.despesasCents]),
  );

  const width = 560;
  const height = 220;
  const padL = 62;
  const padR = 16;
  const padT = 18;
  const padB = 32;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const groupW = chartW / Math.max(1, data.length);
  const barW = Math.min(24, groupW * 0.28);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: accentColor }} />
            Receitas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs inline-block bg-slate-400" />
            Despesas
          </span>
        </div>
        {hoverIdx !== null && data[hoverIdx] && (
          <div className="text-xs font-mono-num text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <span className="font-semibold">{data[hoverIdx].label}:</span>{' '}
            <span className="text-emerald-700">+{formatCompactBRL(data[hoverIdx].receitasCents)}</span>
            {' · '}
            <span className="text-rose-700">-{formatCompactBRL(data[hoverIdx].despesasCents)}</span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible" role="img" aria-label="Gráfico de Receitas e Despesas">
        {ticks.map((t, i) => {
          const y = padT + chartH - (t / maxVal) * chartH;
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray={i === 0 ? undefined : '3 3'} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-mono-num">
                {formatCompactBRL(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padL + i * groupW + groupW / 2;
          const rH = (d.receitasCents / maxVal) * chartH;
          const eH = (d.despesasCents / maxVal) * chartH;
          const isHover = hoverIdx === i;

          return (
            <g
              key={d.label}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={cx - groupW / 2}
                y={padT}
                width={groupW}
                height={chartH}
                fill={isHover ? 'rgba(15, 23, 42, 0.03)' : 'transparent'}
                rx={4}
              />
              <rect
                x={cx - barW - 2}
                y={padT + chartH - rH}
                width={barW}
                height={Math.max(2, rH)}
                rx={3}
                fill={accentColor}
                opacity={isHover ? 1 : 0.9}
              />
              <rect
                x={cx + 2}
                y={padT + chartH - eH}
                width={barW}
                height={Math.max(2, eH)}
                rx={3}
                fill="#94A3B8"
                opacity={isHover ? 1 : 0.85}
              />
              <text x={cx} y={height - 10} textAnchor="middle" className="fill-slate-600 text-[11px] font-medium">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const CashFlowAreaChart: React.FC<{ points: CashFlowPoint[]; accentColor: string }> = ({
  points,
  accentColor,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (points.length === 0) return null;

  const values = points.map((p) => p.saldoAcumuladoCents);
  const minV = Math.min(0, ...values);
  const maxV = Math.max(100000, ...values);
  const span = Math.max(100000, maxV - minV);

  const width = 560;
  const height = 220;
  const padL = 64;
  const padR = 16;
  const padT = 18;
  const padB = 32;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const getX = (idx: number) => padL + (idx / Math.max(1, points.length - 1)) * chartW;
  const getY = (val: number) => padT + chartH - ((val - minV) / span) * chartH;

  const todayIndex = points.findIndex((p) => p.label === 'Hoje');
  const realizedPts = todayIndex >= 0 ? points.slice(0, todayIndex + 1) : points;
  const projectedPts = todayIndex >= 0 ? points.slice(todayIndex) : [];

  const toPath = (pts: CashFlowPoint[], startIdx: number) =>
    pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(startIdx + idx).toFixed(1)} ${getY(p.saldoAcumuladoCents).toFixed(1)}`).join(' ');

  const zeroY = getY(0);

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: accentColor }} />
            Realizado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" />
            Projetado (30 dias)
          </span>
        </div>
        {hoverIdx !== null && points[hoverIdx] && (
          <div className="text-xs font-mono-num text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <span className="font-semibold">{points[hoverIdx].label}:</span>{' '}
            <span className={points[hoverIdx].saldoAcumuladoCents >= 0 ? 'text-slate-900' : 'text-rose-700'}>
              {formatBRL(points[hoverIdx].saldoAcumuladoCents)}
            </span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible" role="img" aria-label="Fluxo de Caixa Realizado e Projetado">
        {[0, 0.33, 0.66, 1].map((t, i) => {
          const val = minV + span * t;
          const y = getY(val);
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-mono-num">
                {formatCompactBRL(val)}
              </text>
            </g>
          );
        })}

        {minV < 0 && (
          <line x1={padL} x2={width - padR} y1={zeroY} y2={zeroY} stroke="#DC2626" strokeWidth={1} strokeOpacity={0.5} />
        )}

        {realizedPts.length > 1 && (
          <path d={toPath(realizedPts, 0)} fill="none" stroke={accentColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {projectedPts.length > 1 && (
          <path
            d={toPath(projectedPts, todayIndex)}
            fill="none"
            stroke="#D97706"
            strokeWidth={2.2}
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, i) => {
          const x = getX(i);
          const y = getY(p.saldoAcumuladoCents);
          const isHover = hoverIdx === i;
          return (
            <g
              key={p.isoDate + i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-pointer"
            >
              <circle cx={x} cy={y} r={14} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={isHover ? 5 : 3.5}
                fill={p.saldoAcumuladoCents < 0 ? '#DC2626' : p.tipo === 'projetado' ? '#D97706' : accentColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <text x={x} y={height - 10} textAnchor="middle" className="fill-slate-600 text-[10px] font-medium">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
