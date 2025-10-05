import type { KpiDatum } from '@/lib/types';

interface KpiStripProps {
  items: KpiDatum[];
}

function formatTrend(value?: number, period?: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return period ? `vs ${period}` : null;
  }

  const percentage = (value * 100).toFixed(Math.abs(value * 100) >= 10 ? 0 : 1);
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  const body = `${prefix}${Math.abs(Number(percentage)).toString()}%`;
  return period ? `${body} ${period}` : body;
}

function trendTone(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
    return 'bg-slate-800/70 border-slate-700/70 text-slate-300';
  }
  return value > 0 ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/40 text-rose-300';
}

export function KpiStrip({ items }: KpiStripProps) {
  if (!items.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const trendLabel = formatTrend(item.trendPercentage, item.trendPeriod);
        return (
          <div
            key={`${item.metric}-${index}`}
            className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5 shadow-inner shadow-black/40 space-y-3"
          >
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400/90">{item.metric}</div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-2xl font-semibold text-white">{item.valueLabel}</span>
              {trendLabel && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.7rem] font-medium ${trendTone(
                  item.trendPercentage
                )}`}>
                  {trendLabel}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-400/90">{item.whyItMatters}</p>
          </div>
        );
      })}
    </div>
  );
}
