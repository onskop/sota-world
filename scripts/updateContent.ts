import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import { randomUUID } from 'crypto';
import type { HistoryEntry, TopicConfig } from '@/lib/types';
import { getInstructions, saveHistory } from '@/lib/data';

interface AIConfig {
  provider: string;
  model: string;
  bulk: {
    enabled: boolean;
    maxBatchSize: number;
  };
  topics: TopicConfig[];
}

interface BulkResponse {
  id: string;
  output: string;
}

const ROOT = process.cwd();

async function loadConfig(): Promise<AIConfig> {
  const filePath = path.join(ROOT, 'config/ai-config.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as AIConfig;
}

export async function runUpdate(specificTopics?: TopicConfig[]) {
  const config = await loadConfig();
  const instructions = await getInstructions();
  const topics = specificTopics ?? config.topics;

  if (!topics.length) {
    console.warn('No topics configured.');
    return;
  }

  if (!process.env.VERCEL_AI_GATEWAY_URL) {
    console.warn('VERCEL_AI_GATEWAY_URL is not defined. Content generation will run in dry-run mode.');
  }

  const batchSize = config.bulk?.maxBatchSize || topics.length;
  const batches = chunk(topics, batchSize);

  for (const batch of batches) {
    const responses = await generateBatch(batch, config, instructions);
    for (const { topic, output } of responses) {
      if (!output) continue;
      const entry = await transformToHistoryEntry(topic.id, output);
      await saveHistory(topic.id, entry);
      console.log(`Saved update for ${topic.title}`);
    }
  }
}

async function generateBatch(batch: TopicConfig[], config: AIConfig, instructions: string) {
  // Always try to use the API, fall back to mock if it fails
  const baseUrl = process.env.VERCEL_AI_GATEWAY_URL || 'http://localhost:3001';

  const body = {
    model: config.model,
    requests: batch.map((topic) => ({
      id: topic.id,
      messages: [
        {
          role: 'system',
          content:
            'You are an elite research analyst generating executive-ready intelligence. Respond strictly in JSON with keys title, summary, markdown, sources (array of URLs).' +
            ' Use html-safe markdown and adhere to provided instructions.'
        },
        {
          role: 'user',
          content: `${instructions}\n\nTOPIC_PROMPT: ${topic.prompt}\n\nProvide a fresh report.`
        }
      ]
    }))
  };
  try {
    const response = await fetch(`${baseUrl}/api/v1/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`API error ${response.status}: ${text}. Falling back to mock content.`);
      return batch.map((topic) => ({ topic, output: mockContent(topic) }));
    }

    const result = (await response.json()) as { responses: BulkResponse[] };
    return batch.map((topic) => ({
      topic,
      output: result.responses.find((res) => res.id === topic.id)?.output ?? ''
    }));
  } catch (error) {
    console.warn('Failed to connect to API. Using mock content:', error);
    return batch.map((topic) => ({ topic, output: mockContent(topic) }));
  }
}

function mockContent(topic: TopicConfig): string {
  return JSON.stringify({
    title: `${topic.title} — Mock Insight`,
    summary: 'Development mode summary. Connect the Vercel AI Gateway to receive live intelligence.',
    markdown: `## Signal Radar\n- Placeholder update for ${topic.title}.\n\n## Investment & Funding Flow\n- Sample funding note.\n\n## Regulatory & Policy Watch\n- Sample regulation note.\n\n## Frontier Experiments\n- Sample experiment.\n\n## Action Playbook\n- Align data infrastructure for upcoming updates.`,
    sources: ['https://example.com/mock-source']
  });
}

async function transformToHistoryEntry(topicId: string, output: string): Promise<HistoryEntry> {
  let parsed: { title: string; summary: string; markdown: string; sources: string[] };
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    console.warn('Failed to parse AI output as JSON. Wrapping raw output as markdown.');
    parsed = {
      title: 'State of the Art Update',
      summary: output.slice(0, 180),
      markdown: output,
      sources: []
    };
  }

  const html = await marked.parse(parsed.markdown);

  return {
    id: randomUUID(),
    topicId,
    generatedAt: new Date().toISOString(),
    title: parsed.title,
    summary: parsed.summary,
    content: html,
    sources: parsed.sources ?? []
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (!size || size <= 0) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

if (require.main === module) {
  runUpdate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
