import 'dotenv/config';
import cron from 'node-cron';
import { promises as fs } from 'fs';
import path from 'path';
import { runUpdate } from './updateContent';
import type { ScheduleConfig, TopicConfig } from '@/lib/types';

interface ScheduleFile {
  schedules: ScheduleConfig[];
}

interface AIConfig {
  provider: string;
  model: string;
  bulk: { enabled: boolean; maxBatchSize: number };
  topics: TopicConfig[];
}

const ROOT = process.cwd();

async function loadSchedules(): Promise<ScheduleFile> {
  const filePath = path.join(ROOT, 'config/schedules.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as ScheduleFile;
}

async function loadTopics(): Promise<TopicConfig[]> {
  const filePath = path.join(ROOT, 'config/ai-config.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  return (JSON.parse(raw) as AIConfig).topics;
}

function buildCronExpression(schedule: ScheduleConfig): string {
  const [hour, minute] = schedule.time.split(':').map((value) => parseInt(value, 10));
  switch (schedule.frequency) {
    case 'daily':
      return `${minute} ${hour} * * *`;
    case 'weekly':
      return `${minute} ${hour} * * ${schedule.dayOfWeek ?? 1}`;
    case 'monthly':
      return `${minute} ${hour} ${schedule.dayOfMonth ?? 1} * *`;
    default:
      throw new Error(`Unsupported frequency: ${schedule.frequency}`);
  }
}

async function bootstrap() {
  const [scheduleFile, topics] = await Promise.all([loadSchedules(), loadTopics()]);

  const schedules = scheduleFile.schedules;
  schedules.forEach((schedule) => {
    const cronExpression = buildCronExpression(schedule);
    const scopedTopics = topics.filter((topic) => topic.scheduleId === schedule.id);

    if (!scopedTopics.length) {
      console.warn(`No topics assigned to schedule ${schedule.id}`);
      return;
    }

    cron.schedule(
      cronExpression,
      () => {
        console.log(`[${new Date().toISOString()}] Triggering ${schedule.id}`);
        runUpdate(scopedTopics).catch((error) => console.error(error));
      },
      {
        timezone: schedule.timezone ?? 'UTC'
      }
    );

    console.log(`Registered ${schedule.frequency} job for ${schedule.id} (${cronExpression}) covering ${scopedTopics.length} topics.`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
