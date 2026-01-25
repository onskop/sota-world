import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Fetch a single list with its items
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch list with items
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select(`
        *,
        list_items(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error('List GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a list
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const { name, icon, color } = body

    // Verify list exists and belongs to user
    const { data: existingList, error: fetchError } = await supabase
      .from('lists')
      .select('id, type')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingList) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }

      // Check for duplicate name (excluding current list)
      const { data: duplicateList } = await supabase
        .from('lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name.trim())
        .neq('id', id)
        .single()

      if (duplicateList) {
        return NextResponse.json(
          { error: 'A list with this name already exists' },
          { status: 409 }
        )
      }

      updates.name = name.trim()
    }

    if (icon !== undefined) {
      updates.icon = icon
    }

    if (color !== undefined) {
      updates.color = color
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    // Update the list
    const { data: updatedList, error: updateError } = await supabase
      .from('lists')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating list:', updateError)
      return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
    }

    return NextResponse.json({ success: true, list: updatedList })
  } catch (error) {
    console.error('List PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a list
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify list exists and belongs to user
    const { data: existingList, error: fetchError } = await supabase
      .from('lists')
      .select('id, type, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingList) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Prevent deletion of system lists (inbox)
    if (existingList.type === 'inbox') {
      return NextResponse.json(
        { error: 'Cannot delete the Inbox list' },
        { status: 403 }
      )
    }

    // Delete the list (cascade will delete items)
    const { error: deleteError } = await supabase
      .from('lists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting list:', deleteError)
      return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('List DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
