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

export interface HistoryEntry {
  id: string;
  topicId: string;
  generatedAt: string;
  title: string;
  summary: string;
  content: string;
  sources: string[];
}

export interface GenerationPayload {
  topic: TopicConfig;
  instructions: string;
}
