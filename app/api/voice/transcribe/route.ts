import { experimental_transcribe as transcribe } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Use OpenAI directly for transcription (not through AI Gateway)
    // AI Gateway doesn't support /audio/transcriptions endpoint
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Transcribe using Vercel AI SDK with OpenAI's Whisper
    const { text } = await transcribe({
      model: openai.transcription('whisper-1'),
      audio: await audioFile.arrayBuffer(),
    });

    // Save to database
    const { data: recording, error: dbError } = await supabase
      .from('voice_recordings')
      .insert({
        user_id: user.id,
        storage_path: `voice-recordings/${user.id}/${Date.now()}.webm`,
        file_size_bytes: audioFile.size,
        duration_seconds: null, // We can calculate this later if needed
        transcription_text: text,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save recording', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recording: {
        id: recording.id,
        transcription: text,
        created_at: recording.created_at,
      },
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      {
        error: 'Transcription failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
