import { MetadataRoute } from 'next';
import { getTopics } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://example.com';
  const topics = await getTopics();

  const topicEntries = topics.map((topic) => ({
    url: `${baseUrl}/topic/${topic.id}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: 0.7
  }));

  return [
    { url: baseUrl, lastModified: new Date().toISOString(), changeFrequency: 'hourly', priority: 1 },
    ...topicEntries
  ];
}
