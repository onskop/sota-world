import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ItemProposal, ListItemMetadata } from '@/lib/supabase/types'

// POST - Confirm and execute a proposed action
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

    const { item_id } = body

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    // Fetch the inbox item with proposal
    const { data: item, error: itemError } = await supabase
      .from('list_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const metadata = item.metadata as ListItemMetadata
    const proposal = metadata?.proposal as ItemProposal | undefined

    if (!proposal) {
      return NextResponse.json(
        { error: 'No proposal found for this item. Run propose first.' },
        { status: 400 }
      )
    }

    if (!proposal.target_list_id) {
      return NextResponse.json(
        { error: 'Proposal has no target list' },
        { status: 400 }
      )
    }

    // Verify target list exists and belongs to user
    const { data: targetList, error: listError } = await supabase
      .from('lists')
      .select('id, name')
      .eq('id', proposal.target_list_id)
      .eq('user_id', user.id)
      .single()

    if (listError || !targetList) {
      return NextResponse.json(
        { error: 'Target list not found' },
        { status: 404 }
      )
    }

    // Get next position in target list
    const { data: maxPosResult } = await supabase
      .from('list_items')
      .select('position')
      .eq('list_id', proposal.target_list_id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosResult?.position ?? -1) + 1

    // Create new item in target list
    const newItemMetadata: ListItemMetadata = {
      source_type: metadata.source_type || 'agent_action',
      voice_recording_id: metadata.voice_recording_id,
      original_content: proposal.original_content,
      moved_from_inbox: true,
      confirmed_at: new Date().toISOString(),
    }

    const { data: newItem, error: insertError } = await supabase
      .from('list_items')
      .insert({
        list_id: proposal.target_list_id,
        user_id: user.id,
        content: proposal.reformulated_content,
        is_checked: false,
        position: nextPosition,
        metadata: newItemMetadata,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating new item:', insertError)
      return NextResponse.json(
        { error: 'Failed to create item in target list' },
        { status: 500 }
      )
    }

    // Delete original inbox item
    const { error: deleteError } = await supabase
      .from('list_items')
      .delete()
      .eq('id', item_id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting original item:', deleteError)
      // Item was created but not deleted - log but don't fail
      console.warn('Warning: Original inbox item was not deleted')
    }

    return NextResponse.json({
      success: true,
      new_item_id: newItem.id,
      target_list_id: proposal.target_list_id,
      target_list_name: targetList.name,
      content: proposal.reformulated_content,
    })
  } catch (error) {
    console.error('Confirm action error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
