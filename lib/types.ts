export interface TopicConfig {
  id: string;
  title: string;
  prompt: string;
  summaryPrompt?: string;
  scheduleId: string;
}

export interface ScheduleConfig {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM 24h
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timezone?: string;
}

export interface KpiDatum {
  metric: string;
  valueLabel: string;
  numericValue?: number;
  unit?: string | null;
  trendPercentage?: number;
  trendPeriod?: string;
  whyItMatters: string;
}

export interface TimelineMilestone {
  horizon: 'near-term' | 'mid-term' | 'long-term' | string;
  window: string;
  milestone: string;
  stakeholders: string[];
  confidence: number;
  impactLevel: string;
}

export interface FundingPoint {
  period: string;
  totalCapitalUsd: number;
  changePercentage?: number;
  topBackers?: string[];
}

export interface TopicVisualData {
  kpis?: KpiDatum[];
  graphicCue?: string;
  timeline?: TimelineMilestone[];
  fundingSeries?: FundingPoint[];
  fundingChartNotes?: string[];
}

export interface HistoryEntry {
  id: string;
  topicId: string;
  generatedAt: string;
  title: string;
  summary: string;
  content: string;
  sources: string[];
  data?: TopicVisualData;
}

export interface GenerationPayload {
  topic: TopicConfig;
  instructions: string;
}
