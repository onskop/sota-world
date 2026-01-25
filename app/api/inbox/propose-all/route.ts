import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { proposeAction, ensureOtherList } from '@/lib/agents/propose-action'
import {
  List,
  ListItem,
  RouterSettings,
  DEFAULT_ROUTER_SETTINGS,
  ItemProposal,
  ListItemMetadata,
} from '@/lib/supabase/types'

interface ProposalResult {
  item_id: string
  proposal: ItemProposal | null
  error?: string
}

// POST - Propose actions for all inbox items (or filtered subset)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { item_ids?: string[] } = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is ok - means propose all
    }

    const { item_ids } = body

    // Get user's inbox
    const { data: inboxList } = await supabase
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'inbox')
      .single()

    if (!inboxList) {
      return NextResponse.json({ error: 'Inbox not found' }, { status: 404 })
    }

    // Build query for inbox items
    let query = supabase
      .from('list_items')
      .select('*')
      .eq('list_id', inboxList.id)
      .eq('user_id', user.id)

    // Filter by specific IDs if provided
    if (item_ids && item_ids.length > 0) {
      query = query.in('id', item_ids)
    }

    const { data: items, error: itemsError } = await query

    if (itemsError) {
      console.error('Error fetching inbox items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ results: [], message: 'No items to propose' })
    }

    // Filter out items that already have pending proposals
    const itemsToPropose = items.filter((item: ListItem) => {
      const metadata = item.metadata as ListItemMetadata
      return !metadata?.proposal || metadata.proposal.status !== 'pending'
    })

    if (itemsToPropose.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'All items already have pending proposals',
      })
    }

    // Fetch user's lists
    const { data: userLists } = await supabase
      .from('lists')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    let lists = (userLists as List[]) || []

    // Ensure "Other" list exists
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

    // Process items in parallel
    const results: ProposalResult[] = await Promise.all(
      itemsToPropose.map(async (item: ListItem) => {
        try {
          const proposalResult = await proposeAction({
            content: item.content,
            userLists: lists,
            routerSettings,
          })

          // Validate target list
          if (!proposalResult.target_list_id) {
            const otherList = lists.find(l => l.name.toLowerCase() === 'other')
            if (otherList) {
              proposalResult.target_list_id = otherList.id
              proposalResult.target_list_name = otherList.name
            }
          }

          const proposal: ItemProposal = {
            target_list_id: proposalResult.target_list_id,
            target_list_name: proposalResult.target_list_name,
            reformulated_content: proposalResult.reformulated_content,
            original_content: item.content,
            proposed_at: new Date().toISOString(),
            status: 'pending',
          }

          // Update item with proposal
          const updatedMetadata = {
            ...item.metadata,
            proposal,
          }

          await supabase
            .from('list_items')
            .update({ metadata: updatedMetadata })
            .eq('id', item.id)
            .eq('user_id', user.id)

          return {
            item_id: item.id,
            proposal,
          }
        } catch (error) {
          console.error(`Error proposing for item ${item.id}:`, error)
          return {
            item_id: item.id,
            proposal: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })
    )

    const successCount = results.filter(r => r.proposal !== null).length
    const errorCount = results.filter(r => r.error).length

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: itemsToPropose.length,
        succeeded: successCount,
        failed: errorCount,
      },
    })
  } catch (error) {
    console.error('Bulk propose error:', error)
    return NextResponse.json(
      { error: 'Failed to propose actions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
