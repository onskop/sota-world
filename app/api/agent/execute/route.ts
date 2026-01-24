import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createRouterTools } from '@/lib/agents/router-tools'
import { buildRouterSystemPrompt } from '@/lib/agents/router-system-prompt'
import { List } from '@/lib/supabase/types'

// Initialize OpenAI client
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { transcription, voice_recording_id } = body

    if (!transcription || typeof transcription !== 'string') {
      return NextResponse.json(
        { error: 'Transcription text is required' },
        { status: 400 }
      )
    }

    // =====================================================
    // FETCH USER CONTEXT (for router intelligence)
    // =====================================================

    // Get user's lists
    const { data: userLists, error: listsError } = await supabase
      .from('lists')
      .select('id, name, type, icon')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (listsError) {
      console.error('Error fetching user lists:', listsError)
    }

    // Get active task count
    const { count: taskCount, error: taskCountError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'completed')

    if (taskCountError) {
      console.error('Error fetching task count:', taskCountError)
    }

    // Build context-aware system prompt
    const systemPrompt = buildRouterSystemPrompt({
      userLists: (userLists as List[]) || [],
      taskCount: taskCount || 0,
    })

    // Create tools with authenticated context
    const routerTools = createRouterTools(user.id, supabase)

    // =====================================================
    // EXECUTE ROUTER AGENT
    // =====================================================

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: `User voice transcription:\n\n"${transcription}"\n\nAnalyze this transcription and call the appropriate tool to save/organize this information.`,
      tools: routerTools,
      toolChoice: 'auto', // Let AI decide which tool to use
    })

    // =====================================================
    // PROCESS RESULTS
    // =====================================================

    const toolResults = result.toolResults || []

    if (toolResults.length === 0) {
      // Fallback: if no tool was called, save to inbox manually
      const { data: inboxList } = await supabase
        .from('lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'inbox')
        .single()

      let inboxId = inboxList?.id

      if (!inboxId) {
        const { data: newInbox } = await supabase
          .from('lists')
          .insert({ user_id: user.id, name: 'Inbox', type: 'inbox' })
          .select()
          .single()
        inboxId = newInbox!.id
      }

      await supabase.from('list_items').insert({
        list_id: inboxId,
        user_id: user.id,
        content: transcription,
        metadata: {
          source_type: 'voice',
          voice_recording_id,
          fallback_save: true,
        },
      })

      return NextResponse.json({
        success: true,
        action: 'fallback_inbox',
        message: 'Saved to Inbox (no tool called)',
        execution: {
          text: result.text,
          toolCalls: 0,
          finishReason: result.finishReason,
        },
      })
    }

    // Get first tool result (router should only call one tool)
    const primaryResult = toolResults[0]

    return NextResponse.json({
      success: true,
      action: primaryResult.toolName,
      result: primaryResult.output,
      execution: {
        text: result.text,
        toolCalls: result.toolCalls?.length || 0,
        finishReason: result.finishReason,
        toolName: primaryResult.toolName,
      },
    })

  } catch (error) {
    console.error('Agent execution error:', error)
    return NextResponse.json(
      {
        error: 'Failed to execute agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
