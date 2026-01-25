import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all inbox items for the user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create the user's inbox list
    let { data: inboxList } = await supabase
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'inbox')
      .single()

    if (!inboxList) {
      // Create inbox if it doesn't exist
      const { data: newInbox, error: createError } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          name: 'Inbox',
          type: 'inbox',
          position: 0,
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating inbox:', createError)
        return NextResponse.json({ error: 'Failed to create inbox' }, { status: 500 })
      }
      inboxList = newInbox
    }

    // Fetch inbox items
    const { data: items, error: fetchError } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', inboxList.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching inbox items:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Inbox GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add item to inbox
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
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required and cannot be empty' }, { status: 400 })
    }

    // Get or create the user's inbox list
    let { data: inboxList } = await supabase
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'inbox')
      .single()

    if (!inboxList) {
      const { data: newInbox, error: createError } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          name: 'Inbox',
          type: 'inbox',
          position: 0,
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating inbox:', createError)
        return NextResponse.json({ error: 'Failed to create inbox' }, { status: 500 })
      }
      inboxList = newInbox
    }

    // Get max position for ordering
    const { data: maxPosResult } = await supabase
      .from('list_items')
      .select('position')
      .eq('list_id', inboxList.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosResult?.position ?? -1) + 1

    // Insert the item
    const { data: item, error: insertError } = await supabase
      .from('list_items')
      .insert({
        list_id: inboxList.id,
        user_id: user.id,
        content: content.trim(),
        is_checked: false,
        position: nextPosition,
        metadata: {
          source_type: 'voice',
        },
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting inbox item:', insertError)
      return NextResponse.json({ error: 'Failed to save to inbox' }, { status: 500 })
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Inbox POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove item from inbox
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('list_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting inbox item:', deleteError)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inbox DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
