import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Create a new list item
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { list_id, content, position } = body

    if (!list_id || !content) {
      return NextResponse.json(
        { error: 'list_id and content are required' },
        { status: 400 }
      )
    }

    // Verify list belongs to user
    const { data: list } = await supabase
      .from('lists')
      .select('id')
      .eq('id', list_id)
      .eq('user_id', user.id)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Create the item
    const { data: item, error: insertError } = await supabase
      .from('list_items')
      .insert({
        list_id,
        user_id: user.id,
        content: content.trim(),
        position: position ?? 0,
        is_checked: false,
        metadata: {
          source_type: 'manual',
        },
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating list item:', insertError)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('List items POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
