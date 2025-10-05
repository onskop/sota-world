import type { TimelineMilestone } from '@/lib/types';

interface MilestoneTimelineProps {
  items: TimelineMilestone[];
}

const HORIZON_ORDER: Record<string, number> = {
  'near-term': 0,
  'mid-term': 1,
  'long-term': 2
};

function formatHorizon(label: string) {
  const lower = label.toLowerCase();
  if (lower in HORIZON_ORDER) {
    return label
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-');
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatConfidence(value: number) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return `${percent}% confidence`;
}

export function MilestoneTimeline({ items }: MilestoneTimelineProps) {
  if (!items.length) return null;

  const enriched = items.map((item, index) => ({ ...item, index }));
  const sorted = enriched.sort((a, b) => {
    const horizonDiff = (HORIZON_ORDER[a.horizon.toLowerCase()] ?? 99) - (HORIZON_ORDER[b.horizon.toLowerCase()] ?? 99);
    if (horizonDiff !== 0) return horizonDiff;
    return a.index - b.index;
  });

  return (
    <ol className="relative space-y-8 border-l border-slate-700/60 pl-6">
      {sorted.map((item) => (
        <li key={`${item.window}-${item.milestone}`} className="relative">
          <span className="absolute -left-3 top-1.5 h-2.5 w-2.5 rounded-full border border-electric/60 bg-slate-900" />
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-electric/70">
            <span>{formatHorizon(item.horizon)}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300/80 normal-case tracking-[0.08em]">{item.window}</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-white">{item.milestone}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400/90">
            <span className="rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 font-medium text-slate-200/90">
              {formatConfidence(item.confidence)}
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 font-medium text-amber-300/80">
              Impact: {item.impactLevel}
            </span>
            {item.stakeholders.length > 0 && (
              <span className="truncate text-slate-400/90">
                Stakeholders: <span className="text-slate-200/90">{item.stakeholders.join(', ')}</span>
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
