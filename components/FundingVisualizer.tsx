import type { FundingPoint } from '@/lib/types';

interface FundingVisualizerProps {
  series: FundingPoint[];
  notes?: string[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 1,
  notation: 'compact'
});

function formatChange(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  const percentage = (value * 100).toFixed(Math.abs(value * 100) >= 10 ? 0 : 1);
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${prefix}${Math.abs(Number(percentage)).toString()}%`;
}

export function FundingVisualizer({ series, notes }: FundingVisualizerProps) {
  if (!series.length) return null;

  const width = 600;
  const height = 220;
  const padding = 32;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;
  const totals = series.map((point) => point.totalCapitalUsd);
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const range = max - min || 1;

  const points = series.map((point, index) => {
    const ratio = series.length > 1 ? index / (series.length - 1) : 0.5;
    const valueRatio = (point.totalCapitalUsd - min) / range;
    const x = padding + ratio * effectiveWidth;
    const y = height - padding - valueRatio * effectiveHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const areaPath = [
    `M ${points[0]?.x.toFixed(2) ?? padding} ${height - padding}`,
    `${points[0] ? `L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}` : ''}`,
    ...points.slice(1).map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    `L ${points[points.length - 1]?.x.toFixed(2) ?? width - padding} ${height - padding}`,
    'Z'
  ].join(' ');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
          <defs>
            <linearGradient id="funding-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#funding-gradient)" />
          <path d={linePath} fill="none" stroke="rgba(56, 189, 248, 0.9)" strokeWidth={3} strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={`${point.x}-${index}`}>
              <circle cx={point.x} cy={point.y} r={5} fill="#38bdf8" stroke="#0f172a" strokeWidth={2} />
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                className="fill-slate-200 text-[10px]"
              >
                {currencyFormatter.format(series[index].totalCapitalUsd)}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-300/90">
            <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="py-2 pr-4">Period</th>
                <th className="py-2 pr-4">Total Capital</th>
                <th className="py-2 pr-4">Δ vs Prior</th>
                <th className="py-2">Top Backers</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.period} className="border-t border-slate-800/60">
                  <td className="py-3 pr-4 font-medium text-slate-200">{point.period}</td>
                  <td className="py-3 pr-4">{currencyFormatter.format(point.totalCapitalUsd)}</td>
                  <td className="py-3 pr-4">{formatChange(point.changePercentage)}</td>
                  <td className="py-3 text-slate-400/90">{point.topBackers?.join(', ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {notes && notes.length > 0 && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5">
          <h5 className="text-xs uppercase tracking-[0.3em] text-slate-400">Chart Notes</h5>
          <ul className="mt-3 space-y-2 text-sm text-slate-300/90">
            {notes.map((note, index) => (
              <li key={`${note}-${index}`} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-electric/80" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
