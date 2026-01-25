import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { proposeAction, ensureOtherList } from '@/lib/agents/propose-action'
import {
  List,
  RouterSettings,
  DEFAULT_ROUTER_SETTINGS,
  ItemProposal,
} from '@/lib/supabase/types'

// POST - Propose action for a single inbox item
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

    // Fetch the inbox item
    const { data: item, error: itemError } = await supabase
      .from('list_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Fetch user's lists (excluding inbox)
    const { data: userLists, error: listsError } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (listsError) {
      console.error('Error fetching lists:', listsError)
      return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
    }

    // Ensure "Other" list exists
    let lists = (userLists as List[]) || []
    const hasOther = lists.some(l => l.name.toLowerCase() === 'other')
    if (!hasOther) {
      const otherList = await ensureOtherList(user.id, supabase)
      lists = [...lists, otherList]
    }

    // Fetch router settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const preferences = (profile?.preferences as Record<string, unknown>) || {}
    const routerSettings = (preferences.router as RouterSettings) || DEFAULT_ROUTER_SETTINGS

    // Call proposal agent
    const proposalResult = await proposeAction({
      content: item.content,
      userLists: lists,
      routerSettings,
    })

    // Validate target list exists
    if (!proposalResult.target_list_id) {
      // Find or create Other list as fallback
      const otherList = lists.find(l => l.name.toLowerCase() === 'other')
      if (otherList) {
        proposalResult.target_list_id = otherList.id
        proposalResult.target_list_name = otherList.name
      }
    }

    // Create proposal object
    const proposal: ItemProposal = {
      target_list_id: proposalResult.target_list_id,
      target_list_name: proposalResult.target_list_name,
      reformulated_content: proposalResult.reformulated_content,
      original_content: item.content,
      proposed_at: new Date().toISOString(),
      status: 'pending',
    }

    // Update item with proposal in metadata
    const updatedMetadata = {
      ...item.metadata,
      proposal,
    }

    const { error: updateError } = await supabase
      .from('list_items')
      .update({ metadata: updatedMetadata })
      .eq('id', item_id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating item with proposal:', updateError)
      return NextResponse.json({ error: 'Failed to save proposal' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      proposal,
      confidence: proposalResult.confidence,
      reasoning: proposalResult.reasoning,
    })
  } catch (error) {
    console.error('Propose action error:', error)
    return NextResponse.json(
      { error: 'Failed to propose action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
