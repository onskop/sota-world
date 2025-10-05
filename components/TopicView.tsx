import { Suspense } from 'react';
import { TopicViewContent } from './TopicViewContent';

export function TopicView({ topicId }: { topicId: string }) {
  return (
    <Suspense fallback={<div className="glass-card p-10 text-center text-slate-400">Loading latest intelligence…</div>}>
      <TopicViewContent topicId={topicId} />
    </Suspense>
  );
}
