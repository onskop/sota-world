/**
 * updateContent script for Vercel AI Gateway
 * 
 * Features:
 * - Auto-corrects Vercel AI Gateway URLs
 * - OpenAI-compatible request format
 * - Comprehensive error handling
 * 
 * Run with: npx tsx scripts/updateContent.ts
 */

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
  topics: TopicConfig[];
}

const ROOT = process.cwd();

async function loadConfig(): Promise<AIConfig> {
  const filePath = path.join(ROOT, 'config/ai-config.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as AIConfig;
}

async function validateVercelAIGateway(baseUrl: string): Promise<boolean> {
  try {
    const testBody = {
      model: 'test',
      messages: [{ role: 'user', content: 'test' }]
    };
    
    const testResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.VERCEL_AI_GATEWAY_API_KEY && {
          'Authorization': `Bearer ${process.env.VERCEL_AI_GATEWAY_API_KEY}`
        })
      },
      body: JSON.stringify(testBody)
    });
    
    return testResponse.ok;
  } catch (error) {
    console.error(`Failed to validate Vercel AI Gateway:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}



export async function runUpdate(specificTopics?: TopicConfig[]) {
  const config = await loadConfig();
  const instructions = await getInstructions();
  const topics = specificTopics ?? config.topics;

  if (!topics.length) {
    console.warn('No topics configured.');
    return;
  }

  const baseUrl = process.env.VERCEL_AI_GATEWAY_URL;
  if (!baseUrl) {
    console.warn('VERCEL_AI_GATEWAY_URL is not defined. Content generation will run in dry-run mode.');
  } else {
    // Ensure the URL ends with the correct chat completions endpoint
    let chatCompletionsUrl = baseUrl;
    if (!baseUrl.endsWith('/v1/chat/completions')) {
      if (baseUrl.endsWith('/v1')) {
        chatCompletionsUrl = `${baseUrl}/chat/completions`;
      } else if (baseUrl.endsWith('/v1/')) {
        chatCompletionsUrl = `${baseUrl}chat/completions`;
      } else {
        chatCompletionsUrl = `${baseUrl}/v1/chat/completions`;
      }
      console.log(`Corrected URL to: ${chatCompletionsUrl}`);
    }
    
    // Update the baseUrl for use in generateForTopic
    process.env.VERCEL_AI_GATEWAY_URL = chatCompletionsUrl;
  }

  for (const topic of topics) {
    console.log(`Processing topic: ${topic.title}`);
    const output = await generateForTopic(topic, config, instructions, process.env.VERCEL_AI_GATEWAY_URL);
    if (!output) {
      console.warn(`No output generated for ${topic.title}`);
      continue;
    }

    const entry = await transformToHistoryEntry(topic.id, output);
    await saveHistory(topic.id, entry);
    console.log(`Saved update for ${topic.title}`);
  }
}

async function generateForTopic(topic: TopicConfig, config: AIConfig, instructions: string, baseUrl?: string) {
  if (!baseUrl) {
    console.log(`No baseUrl provided for ${topic.title}, using mock content`);
    return mockContent(topic);
  }

  const body = {
    model: config.model,
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
    ],
    stream: false,
    temperature: 0.7,
    max_tokens: 4000
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (process.env.VERCEL_AI_GATEWAY_API_KEY) {
    headers.Authorization = `Bearer ${process.env.VERCEL_AI_GATEWAY_API_KEY}`;
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`API error ${response.status}: ${text}. Falling back to mock content for ${topic.title}.`);
      return mockContent(topic);
    }

    const result = await response.json();
    const output = extractContent(result);

    if (!output) {
      console.warn('Received empty response from API. Falling back to mock content.');
      return mockContent(topic);
    }

    return output;
  } catch (error) {
    console.warn(`Failed to connect to API for ${topic.title}. Using mock content:`, error instanceof Error ? error.message : String(error));
    return mockContent(topic);
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

function extractContent(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  if (!result || typeof result !== 'object') {
    return '';
  }

  const data = result as Record<string, unknown>;

  if (typeof data.output === 'string') {
    return data.output;
  }

  if (typeof data.response === 'string') {
    return data.response;
  }

  if (Array.isArray(data.outputs)) {
    const outputs = data.outputs
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'content' in item && typeof (item as { content?: string }).content === 'string') {
          return (item as { content?: string }).content ?? '';
        }
        return '';
      })
      .filter(Boolean);
    if (outputs.length) {
      return outputs.join('\n');
    }
  }

  if (Array.isArray(data.choices)) {
    const choices = data.choices as Array<{ message?: { content?: string }; text?: string } | null | undefined>;
    for (const choice of choices) {
      if (!choice) continue;
      if (typeof choice.text === 'string' && choice.text.trim()) {
        return choice.text;
      }
      const content = choice.message?.content;
      if (typeof content === 'string' && content.trim()) {
        return content;
      }
    }
  }

  if (Array.isArray(data.data)) {
    const items = data.data as Array<{ content?: Array<{ text?: string }> }>;
    for (const item of items) {
      if (!item?.content) continue;
      for (const block of item.content) {
        if (block?.text && block.text.trim()) {
          return block.text;
        }
      }
    }
  }

  return '';
}

if (require.main === module) {
  runUpdate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
