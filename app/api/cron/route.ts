import { NextRequest, NextResponse } from 'next/server';
import { runUpdate } from '@/scripts/updateContent';
import type { ScheduleConfig, TopicConfig } from '@/lib/types';

interface ScheduleFile {
  schedules: ScheduleConfig[];
}

interface AIConfig {
  provider: string;
  model: string;
  topics: TopicConfig[];
}

// This function will be called by Vercel Cron Jobs
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load schedules and topics
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    const ROOT = process.cwd();
    
    const scheduleFilePath = path.join(ROOT, 'config/schedules.json');
    const aiConfigFilePath = path.join(ROOT, 'config/ai-config.json');
    
    const [scheduleFileRaw, aiConfigRaw] = await Promise.all([
      fs.readFile(scheduleFilePath, 'utf-8'),
      fs.readFile(aiConfigFilePath, 'utf-8')
    ]);
    
    const scheduleFile: ScheduleFile = JSON.parse(scheduleFileRaw);
    const aiConfig: AIConfig = JSON.parse(aiConfigRaw);
    
    // Get the current time to determine which schedules should run
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDayOfWeek = now.getUTCDay();
    const currentDayOfMonth = now.getUTCDate();
    
    const schedulesToRun: ScheduleConfig[] = [];
    
    for (const schedule of scheduleFile.schedules) {
      const [hour, minute] = schedule.time.split(':').map(v => parseInt(v, 10));
      
      let shouldRun = false;
      
      switch (schedule.frequency) {
        case 'daily':
          shouldRun = currentHour === hour && currentMinute === minute;
          break;
        case 'weekly':
          shouldRun = currentHour === hour && 
                     currentMinute === minute && 
                     currentDayOfWeek === (schedule.dayOfWeek ?? 1);
          break;
        case 'monthly':
          shouldRun = currentHour === hour && 
                     currentMinute === minute && 
                     currentDayOfMonth === (schedule.dayOfMonth ?? 1);
          break;
      }
      
      if (shouldRun) {
        schedulesToRun.push(schedule);
      }
    }
    
    if (schedulesToRun.length === 0) {
      return NextResponse.json({ 
        message: 'No schedules to run at this time',
        timestamp: now.toISOString()
      });
    }
    
    // Run updates for each schedule
    const results = [];
    for (const schedule of schedulesToRun) {
      const scopedTopics = aiConfig.topics.filter(topic => topic.scheduleId === schedule.id);
      
      if (scopedTopics.length === 0) {
        console.warn(`No topics assigned to schedule ${schedule.id}`);
        continue;
      }
      
      try {
        console.log(`[${now.toISOString()}] Triggering ${schedule.id}`);
        await runUpdate(scopedTopics);
        results.push({
          scheduleId: schedule.id,
          topicsCount: scopedTopics.length,
          status: 'success'
        });
      } catch (error) {
        console.error(`Error running schedule ${schedule.id}:`, error);
        results.push({
          scheduleId: schedule.id,
          topicsCount: scopedTopics.length,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      message: `Processed ${schedulesToRun.length} schedules`,
      timestamp: now.toISOString(),
      results
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
