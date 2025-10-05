import { NextResponse } from 'next/server';
import { getHistory, getTopics } from '@/lib/data';

export async function GET() {
  const topics = await getTopics();
  const payload = await Promise.all(
    topics.map(async (topic) => {
      const history = await getHistory(topic.id);
      return {
        ...topic,
        latest: history[0] ?? null,
        historyCount: history.length,
      };
    })
  );

  return NextResponse.json({ topics: payload });
}
