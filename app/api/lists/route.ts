import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch all lists for the user with item counts
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch lists with item counts
    const { data: lists, error: listsError } = await supabase
      .from('lists')
      .select(`
        *,
        list_items(count)
      `)
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (listsError) {
      console.error('Error fetching lists:', listsError)
      return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
    }

    // Transform the response to include item_count
    const listsWithCounts = (lists || []).map(list => ({
      ...list,
      item_count: list.list_items?.[0]?.count || 0,
      list_items: undefined, // Remove nested data
    }))

    return NextResponse.json({ lists: listsWithCounts })
  } catch (error) {
    console.error('Lists GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new list
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

    const { name, type = 'custom', icon, color } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check for duplicate name
    const { data: existingList } = await supabase
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existingList) {
      return NextResponse.json(
        { error: 'A list with this name already exists' },
        { status: 409 }
      )
    }

    // Get next position
    const { data: maxPosResult } = await supabase
      .from('lists')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosResult?.position ?? -1) + 1

    // Create the list
    const { data: newList, error: insertError } = await supabase
      .from('lists')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type: type || 'custom',
        icon: icon || null,
        color: color || null,
        position: nextPosition,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating list:', insertError)
      return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
    }

    return NextResponse.json({ success: true, list: newList })
  } catch (error) {
    console.error('Lists POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
