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
import type {
  FundingPoint,
  HistoryEntry,
  KpiDatum,
  TimelineMilestone,
  TopicConfig,
  TopicVisualData
} from '@/lib/types';
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
    markdown: `## TL;DR Signal Snapshot\n- Placeholder highlight for ${topic.title}.\n- Add real data by configuring the AI gateway.\n- Funding insights and domain outlooks will appear here.\n\nGraphic Cue: radial dial showing mock readiness level.\n\n## Timeline of Imminent Trials\nA real report will describe upcoming trials across horizons.\n\n## Funding Flow Dashboard\nFunding commentary will render once live data is available.\n\nChart Notes\n- Connect the gateway to populate funding trends.\n\n## Frontier Domains Outlook\n### Mock Domain\n**Quick Take:** Placeholder.\n\n**Latest Progress:**\n- Update pending.\n\n**Next 12–24 Month Outlook:** Real milestones appear once the gateway is configured.\n\n## Public Readiness Brief\nThis section will translate longevity breakthroughs for broader audiences.\n\nKey Questions from the Public\n- When will real data arrive?\n\n## Action Playbook\n- Configure the AI gateway to replace this mock content.`,
    sources: ['https://example.com/mock-source'],
    data: {
      kpis: [
        {
          metric: 'Active Longevity Trials',
          valueLabel: '—',
          numericValue: 0,
          unit: 'trials',
          trendPercentage: 0,
          trendPeriod: 'QoQ',
          whyItMatters: 'Connect the data pipeline to display live trial counts.'
        }
      ],
      graphicCue: 'Radial gauge showing share of phase III assets on track.',
      timeline: [
        {
          horizon: 'near-term',
          window: 'Next 12 months',
          milestone: 'Real milestones will appear after data generation is enabled.',
          stakeholders: ['SOTA World'],
          confidence: 0.5,
          impactLevel: 'Medium'
        }
      ],
      fundingSeries: [
        {
          period: '2024 Q1',
          totalCapitalUsd: 0,
          changePercentage: 0,
          topBackers: ['Enable gateway for investors']
        }
      ],
      fundingChartNotes: ['Chart will render once fundingSeries contains real datapoints.']
    } satisfies TopicVisualData
  });
}

async function transformToHistoryEntry(topicId: string, output: string): Promise<HistoryEntry> {
  let parsed: { title: string; summary: string; markdown: string; sources?: unknown; data?: unknown };
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
  const sources = normalizeSources(parsed.sources);
  const visualData = normalizeVisualData(parsed.data);

  return {
    id: randomUUID(),
    topicId,
    generatedAt: new Date().toISOString(),
    title: parsed.title,
    summary: parsed.summary,
    content: html,
    sources,
    ...(visualData ? { data: visualData } : {})
  };
}

function normalizeSources(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item): item is string => item.length > 0);
}

function normalizeVisualData(input: unknown): TopicVisualData | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const raw = input as Record<string, unknown>;

  const kpis = Array.isArray(raw.kpis)
    ? raw.kpis
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const metric = typeof (item as { metric?: unknown }).metric === 'string' ? (item as { metric?: string }).metric!.trim() : '';
          const valueLabel =
            typeof (item as { valueLabel?: unknown }).valueLabel === 'string'
              ? (item as { valueLabel?: string }).valueLabel!.trim()
              : '';
          const whyItMatters =
            typeof (item as { whyItMatters?: unknown }).whyItMatters === 'string'
              ? (item as { whyItMatters?: string }).whyItMatters!.trim()
              : '';

          if (!metric || !valueLabel || !whyItMatters) {
            return null;
          }

          const numericValueRaw = (item as { numericValue?: unknown }).numericValue;
          const numericValue = typeof numericValueRaw === 'number' && Number.isFinite(numericValueRaw) ? numericValueRaw : undefined;

          const unitRaw = (item as { unit?: unknown }).unit;
          const unit = typeof unitRaw === 'string' ? unitRaw : unitRaw === null ? null : undefined;

          const trendPercentageRaw = (item as { trendPercentage?: unknown }).trendPercentage;
          const trendPercentage = typeof trendPercentageRaw === 'number' && Number.isFinite(trendPercentageRaw) ? trendPercentageRaw : undefined;

          const trendPeriodRaw = (item as { trendPeriod?: unknown }).trendPeriod;
          const trendPeriod = typeof trendPeriodRaw === 'string' && trendPeriodRaw.trim() ? trendPeriodRaw.trim() : undefined;

          return {
            metric,
            valueLabel,
            whyItMatters,
            ...(numericValue !== undefined ? { numericValue } : {}),
            ...(unit !== undefined ? { unit } : {}),
            ...(trendPercentage !== undefined ? { trendPercentage } : {}),
            ...(trendPeriod ? { trendPeriod } : {})
          } as KpiDatum;
        })
        .filter((item): item is KpiDatum => item !== null && item.metric.length > 0)
    : undefined;

  const timeline = Array.isArray(raw.timeline)
    ? raw.timeline
        .map((item, index) => {
          if (!item || typeof item !== 'object') return null;
          const horizonRaw = (item as { horizon?: unknown }).horizon;
          const window = typeof (item as { window?: unknown }).window === 'string' ? (item as { window?: string }).window!.trim() : '';
          const milestone =
            typeof (item as { milestone?: unknown }).milestone === 'string'
              ? (item as { milestone?: string }).milestone!.trim()
              : '';

          if (!window || !milestone) {
            return null;
          }

          const stakeholdersRaw = (item as { stakeholders?: unknown }).stakeholders;
          const stakeholders = Array.isArray(stakeholdersRaw)
            ? stakeholdersRaw
                .map((value) => (typeof value === 'string' ? value.trim() : ''))
                .filter((value): value is string => value.length > 0)
            : [];

          const confidenceRaw = (item as { confidence?: unknown }).confidence;
          const confidence =
            typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
              ? Math.min(Math.max(confidenceRaw, 0), 1)
              : 0.5;

          const impactLevelRaw = (item as { impactLevel?: unknown }).impactLevel;
          const impactLevel = typeof impactLevelRaw === 'string' && impactLevelRaw.trim() ? impactLevelRaw.trim() : '—';

          const normalizedHorizon =
            typeof horizonRaw === 'string' && horizonRaw.trim().length > 0 ? horizonRaw.trim() : (['near-term', 'mid-term', 'long-term'][Math.min(index, 2)] ?? 'near-term');

          return {
            horizon: normalizedHorizon,
            window,
            milestone,
            stakeholders,
            confidence,
            impactLevel
          } as TimelineMilestone;
        })
        .filter((item): item is TimelineMilestone => item !== null)
    : undefined;

  const fundingSeries = Array.isArray(raw.fundingSeries)
    ? raw.fundingSeries
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const period = typeof (item as { period?: unknown }).period === 'string' ? (item as { period?: string }).period!.trim() : '';
          const totalCapitalRaw = (item as { totalCapitalUsd?: unknown }).totalCapitalUsd;
          const totalCapitalUsd = typeof totalCapitalRaw === 'number' && Number.isFinite(totalCapitalRaw) ? totalCapitalRaw : undefined;

          if (!period || totalCapitalUsd === undefined) {
            return null;
          }

          const changeRaw = (item as { changePercentage?: unknown }).changePercentage;
          const changePercentage = typeof changeRaw === 'number' && Number.isFinite(changeRaw) ? changeRaw : undefined;

          const topBackersRaw = (item as { topBackers?: unknown }).topBackers;
          const topBackers = Array.isArray(topBackersRaw)
            ? topBackersRaw
                .map((value) => (typeof value === 'string' ? value.trim() : ''))
                .filter((value): value is string => value.length > 0)
            : undefined;

          return {
            period,
            totalCapitalUsd,
            ...(changePercentage !== undefined ? { changePercentage } : {}),
            ...(topBackers && topBackers.length > 0 ? { topBackers } : {})
          } as FundingPoint;
        })
        .filter((item): item is FundingPoint => item !== null)
    : undefined;

  const fundingChartNotes = Array.isArray(raw.fundingChartNotes)
    ? raw.fundingChartNotes
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item): item is string => item.length > 0)
    : undefined;

  const graphicCueRaw = raw.graphicCue;
  const graphicCue = typeof graphicCueRaw === 'string' && graphicCueRaw.trim() ? graphicCueRaw.trim() : undefined;

  const hasContent = Boolean(
    (kpis && kpis.length > 0) ||
      (timeline && timeline.length > 0) ||
      (fundingSeries && fundingSeries.length > 0) ||
      (fundingChartNotes && fundingChartNotes.length > 0) ||
      graphicCue
  );

  if (!hasContent) {
    return undefined;
  }

  const normalized: TopicVisualData = {};
  if (kpis && kpis.length > 0) normalized.kpis = kpis;
  if (timeline && timeline.length > 0) normalized.timeline = timeline;
  if (fundingSeries && fundingSeries.length > 0) normalized.fundingSeries = fundingSeries;
  if (fundingChartNotes && fundingChartNotes.length > 0) normalized.fundingChartNotes = fundingChartNotes;
  if (graphicCue) normalized.graphicCue = graphicCue;

  return normalized;
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
