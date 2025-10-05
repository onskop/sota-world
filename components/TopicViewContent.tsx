import { AdRail } from '@/components/ads/AdRail';
import { AdInline } from '@/components/ads/AdInline';
import { HistoryPanel } from '@/components/HistoryPanel';
import { KpiStrip } from '@/components/KpiStrip';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { FundingVisualizer } from '@/components/FundingVisualizer';
import { getHistory, getTopicById } from '@/lib/data';
import type { HistoryEntry } from '@/lib/types';

export async function TopicViewContent({ topicId }: { topicId: string }) {
  const topic = await getTopicById(topicId);
  if (!topic) {
    return <div className="glass-card p-10 text-center text-slate-400">Topic not found.</div>;
  }

  const history = await getHistory(topicId);
  const latest = history[0];

  return (
    <section className="grid lg:grid-cols-[1fr_minmax(220px,280px)] gap-8 items-start">
      <article className="glass-card p-8 lg:p-10 space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap justify-between gap-3 items-center">
            <h2 className="text-3xl font-display font-semibold text-white">{topic.title}</h2>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Updated {latest?.generatedAt ? new Date(latest.generatedAt).toLocaleString() : '—'}</span>
          </div>
          <p className="text-slate-300/90 text-sm md:text-base">
            {topic.prompt}
          </p>
        </header>

        <AdInline slot="hero" />

        {latest ? <ArticleBody entry={latest} /> : <EmptyState />}

        <AdInline slot="footer" />
      </article>

      <aside className="space-y-6">
        <AdRail />
        <HistoryPanel topicId={topicId} history={history} />
      </aside>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-slate-400 text-sm">
      No reports generated yet. Configure the scheduler and run the update task to fetch the inaugural briefing.
    </div>
  );
}

function ArticleBody({ entry }: { entry: HistoryEntry }) {
  const kpis = entry.data?.kpis ?? [];
  const timeline = entry.data?.timeline ?? [];
  const fundingSeries = entry.data?.fundingSeries ?? [];
  const fundingNotes = entry.data?.fundingChartNotes ?? [];
  const graphicCue = entry.data?.graphicCue;

  const hasKpis = kpis.length > 0;
  const hasTimeline = timeline.length > 0;
  const hasFunding = fundingSeries.length > 1 || (fundingSeries.length === 1 && fundingSeries[0].totalCapitalUsd > 0);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold text-electric">{entry.title}</h3>
        <p className="text-slate-300/80 text-sm">{entry.summary}</p>
      </div>

      {hasKpis && (
        <section aria-label="Key performance indicators" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xs uppercase tracking-[0.3em] text-slate-400">KPI Strip</h4>
            {graphicCue && (
              <span className="rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-slate-400/90">
                Graphic Cue: <span className="ml-1 normal-case tracking-normal text-slate-200/90">{graphicCue}</span>
              </span>
            )}
          </div>
          <KpiStrip items={kpis} />
        </section>
      )}

      {hasTimeline && (
        <section aria-label="Milestone timeline" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-xs uppercase tracking-[0.3em] text-slate-400">Timeline of Imminent Trials</h4>
            <span className="text-xs text-slate-400/80">Sequenced by horizon and expected window.</span>
          </div>
          <MilestoneTimeline items={timeline} />
        </section>
      )}

      {hasFunding && (
        <section aria-label="Funding flow" className="space-y-4">
          <h4 className="text-xs uppercase tracking-[0.3em] text-slate-400">Funding Volume Trend</h4>
          <FundingVisualizer series={fundingSeries} notes={fundingNotes} />
        </section>
      )}

      <div className="article-body text-slate-200" dangerouslySetInnerHTML={{ __html: entry.content }} />
      {entry.sources.length > 0 && (
        <div className="border-t border-slate-700/60 pt-6">
          <h4 className="mb-3 text-sm uppercase tracking-[0.3em] text-slate-400">Sources</h4>
          <ul className="space-y-2 text-sm text-electric/90">
            {entry.sources.map((source) => (
              <li key={source} className="truncate">
                <a href={source} target="_blank" rel="noopener noreferrer" className="hover:text-electric">
                  {source}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
