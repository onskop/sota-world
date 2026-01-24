import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { HistoryEntry, TopicConfig } from './types';

const ROOT = process.cwd();

async function readJsonFile<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(ROOT, relativePath);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

export async function getTopics(): Promise<TopicConfig[]> {
  const config = await readJsonFile<{ topics: TopicConfig[] }>('config/ai-config.json', { topics: [] });
  return config.topics;
}

export async function getTopicById(topicId: string): Promise<TopicConfig | undefined> {
  const topics = await getTopics();
  return topics.find((topic) => topic.id === topicId);
}

export async function getInstructions(): Promise<string> {
  const instructionPath = path.join(ROOT, 'config/instructions.md');
  const file = await fs.readFile(instructionPath, 'utf-8');
  const parsed = matter(file);
  return parsed.content.trim();
}

export async function getHistory(topicId: string): Promise<HistoryEntry[]> {
  const history = await readJsonFile<HistoryEntry[]>(`data/history/${topicId}.json`, []);
  return history.sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1));
}

export async function saveHistory(topicId: string, entry: HistoryEntry): Promise<void> {
  const filePath = path.join(ROOT, `data/history/${topicId}.json`);
  const existing = await getHistory(topicId);
  const updated = [entry, ...existing];
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
}

export async function getLatestEntry(topicId: string): Promise<HistoryEntry | undefined> {
  const history = await getHistory(topicId);
  return history[0];
}
