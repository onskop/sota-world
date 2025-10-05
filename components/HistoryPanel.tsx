'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { HistoryEntry } from '@/lib/types';

interface Props {
  topicId: string;
  history: HistoryEntry[];
}

export function HistoryPanel({ topicId, history }: Props) {
  const [activeId, setActiveId] = useState<string>(history[0]?.id ?? '');

  const selected = useMemo(() => history.find((entry) => entry.id === activeId) ?? history[0], [activeId, history]);

  return (
    <div className="glass-card p-6 space-y-5">
      <div>
        <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">History</h3>
        <p className="text-xs text-slate-500 mt-2">Access every AI-generated report for {topicId}.</p>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setActiveId(entry.id)}
            className={`history-item w-full text-left p-3 rounded-lg border text-xs space-y-1 ${
              selected?.id === entry.id ? 'border-electric/80 bg-electric/10 text-electric' : 'border-slate-700 text-slate-300'
            }`}
          >
            <div className="font-semibold">{new Date(entry.generatedAt).toLocaleString()}</div>
            <div className="text-[11px] text-slate-400">
              {formatDistanceToNow(new Date(entry.generatedAt), { addSuffix: true })}
            </div>
            <p
              className="text-[11px] text-slate-400"
              style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
            >
              {entry.summary}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <a
          href={`/?topic=${topicId}&entry=${selected.id}`}
          className="block text-center text-xs font-semibold uppercase tracking-[0.25em] text-electric hover:text-electric/70"
        >
          Permalink
        </a>
      )}
    </div>
  );
}
