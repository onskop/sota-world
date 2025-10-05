import { NavigationTabs } from '@/components/NavigationTabs';
import { TopicView } from '@/components/TopicView';
import { getTopics } from '@/lib/data';

export default async function HomePage() {
  const topics = await getTopics();
  const defaultTopic = topics[0];

  return (
    <main className="main-wrapper space-y-10">
      <header className="space-y-6 text-center md:text-left">
        <p className="uppercase tracking-[0.4em] text-electric/80 text-sm">State of the Art Pulse</p>
        <h1 className="text-4xl md:text-5xl font-display font-semibold text-white">
          Intelligence Hub for Frontier Innovation
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto md:mx-0">
          Daily AI-researched dossiers on longevity, artificial intelligence, pharmaceuticals, automation, and beyond. Stay
          ahead with executive-ready summaries, rigorous sourcing, and monetized insights.
        </p>
      </header>

      <NavigationTabs topics={topics} />

      {defaultTopic ? (
        <TopicView topicId={defaultTopic.id} />
      ) : (
        <div className="glass-card p-10 text-center text-slate-300">No topics configured yet.</div>
      )}
    </main>
  );
}
