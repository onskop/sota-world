import { experimental_transcribe as transcribe } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { UserSettings, DEFAULT_USER_SETTINGS } from '@/lib/supabase/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Fetch user's language preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const preferences = (profile?.preferences as Record<string, unknown>) || {}
    const personalSettings = (preferences.personal as UserSettings) || DEFAULT_USER_SETTINGS
    const voiceLanguage = personalSettings.voiceLanguage

    // Use OpenAI directly for transcription (not through AI Gateway)
    // AI Gateway doesn't support /audio/transcriptions endpoint
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Build transcription options with optional language hint
    // Language improves accuracy when user specifies their recording language
    const transcribeOptions: Parameters<typeof transcribe>[0] = {
      model: openai.transcription('whisper-1'),
      audio: await audioFile.arrayBuffer(),
    }

    // Add language hint if not auto-detect
    if (voiceLanguage && voiceLanguage !== 'auto') {
      transcribeOptions.providerOptions = {
        openai: { language: voiceLanguage },
      }
    }

    // Transcribe using Vercel AI SDK with OpenAI's Whisper
    const { text } = await transcribe(transcribeOptions)

    // Just return the transcription - no database saving
    // Voice files are kept in memory only, not stored permanently
    return NextResponse.json({
      success: true,
      transcription: text,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      {
        error: 'Transcription failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
