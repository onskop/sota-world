import { notFound } from 'next/navigation';
import { NavigationTabs } from '@/components/NavigationTabs';
import { TopicView } from '@/components/TopicView';
import { getTopics } from '@/lib/data';

interface Props {
  params: { id: string };
}

export default async function TopicPage({ params }: Props) {
  const topics = await getTopics();
  const topic = topics.find((item) => item.id === params.id);

  if (!topic) {
    notFound();
  }

  return (
    <main className="main-wrapper space-y-10">
      <header className="space-y-6 text-center md:text-left">
        <p className="uppercase tracking-[0.4em] text-electric/80 text-sm">State of the Art Pulse</p>
        <h1 className="text-4xl md:text-5xl font-display font-semibold text-white">{topic.title}</h1>
        <p className="text-slate-300 max-w-2xl mx-auto md:mx-0">
          Explore the freshest intelligence curated by autonomous research agents, complete with monetized insights and history
          access.
        </p>
      </header>

      <NavigationTabs topics={topics} />
      <TopicView topicId={topic.id} />
    </main>
  );
}
