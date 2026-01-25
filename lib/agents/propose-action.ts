/**
 * Propose Action Agent
 * Analyzes inbox content and proposes categorization
 * Uses generateObject for structured output
 */

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import type { List, RouterSettings, RouterModelType } from '@/lib/supabase/types'

// Schema for proposal response
const proposalSchema = z.object({
  target_list_name: z.string().describe('Name of the list to move this item to'),
  reformulated_content: z.string().describe('Cleaner/shorter version of the content appropriate for the target list'),
  confidence: z.number().min(0).max(1).describe('Confidence in this categorization (0-1)'),
  reasoning: z.string().describe('Brief explanation of why this categorization was chosen'),
})

export type ProposalResult = z.infer<typeof proposalSchema>

interface ProposeActionParams {
  content: string
  userLists: List[]
  routerSettings?: RouterSettings
}

/**
 * Build system prompt for proposal agent
 */
function buildProposalSystemPrompt(userLists: List[], toolDescriptions?: RouterSettings['tools']): string {
  const listsContext = userLists
    .filter(l => l.type !== 'inbox') // Don't suggest moving to inbox
    .map(l => `- "${l.name}" (${l.type})`)
    .join('\n')

  const customDescriptions = toolDescriptions
    ? `
Tool Context:
- List items: ${toolDescriptions.add_to_list.description}
- Tasks: ${toolDescriptions.create_task.description}
`
    : ''

  return `You are a categorization assistant. Your job is to analyze inbox items and propose which list they should be moved to.

## Available Lists
${listsContext || '- "Other" (custom) - default fallback'}

## Rules

1. **Analyze the content** and determine which list it belongs to
2. **Reformulate the content** to be cleaner and more appropriate for the target list:
   - Shopping lists: "I need to buy some milk" → "Milk"
   - Movie lists: "I want to watch that movie Inception" → "Inception"
   - Task lists: Keep action-oriented but concise
   - Other/general: Clean up but preserve meaning

3. **If no list clearly matches**, suggest "Other" as the target

4. **Preserve the original meaning** - don't lose important details

5. **Be concise** in reformulation - remove filler words, but keep specifics
${customDescriptions}
## Examples

Input: "I need to remember to buy milk and eggs from the store"
→ target_list_name: "Shopping", reformulated_content: "Milk, Eggs"

Input: "watch inception tonight it looks amazing"
→ target_list_name: "Movies", reformulated_content: "Inception"

Input: "random thought about improving the app design"
→ target_list_name: "Other", reformulated_content: "Improve app design"

Input: "call mom tomorrow about birthday party"
→ target_list_name: "Tasks", reformulated_content: "Call mom about birthday party"

Return your analysis as a structured JSON object.`
}

/**
 * Propose an action for an inbox item
 */
export async function proposeAction({
  content,
  userLists,
  routerSettings,
}: ProposeActionParams): Promise<{
  target_list_id: string
  target_list_name: string
  reformulated_content: string
  confidence: number
  reasoning: string
}> {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Use configured model or default
  const modelId: RouterModelType = routerSettings?.model || 'gpt-4o-mini'

  const systemPrompt = buildProposalSystemPrompt(
    userLists,
    routerSettings?.tools
  )

  const result = await generateObject({
    model: openai(modelId),
    schema: proposalSchema,
    system: systemPrompt,
    prompt: `Analyze this inbox item and propose a categorization:\n\n"${content}"`,
  })

  const proposal = result.object

  // Map list name to ID
  // First try exact match (case-insensitive)
  let targetList = userLists.find(
    l => l.name.toLowerCase() === proposal.target_list_name.toLowerCase()
  )

  // If no match, try partial match
  if (!targetList) {
    targetList = userLists.find(
      l => l.name.toLowerCase().includes(proposal.target_list_name.toLowerCase()) ||
           proposal.target_list_name.toLowerCase().includes(l.name.toLowerCase())
    )
  }

  // If still no match, use "Other" list or create a fallback
  if (!targetList) {
    targetList = userLists.find(l => l.name.toLowerCase() === 'other')
  }

  // Final fallback - use first non-inbox list or default
  if (!targetList) {
    targetList = userLists.find(l => l.type !== 'inbox')
  }

  return {
    target_list_id: targetList?.id || '',
    target_list_name: targetList?.name || proposal.target_list_name,
    reformulated_content: proposal.reformulated_content,
    confidence: proposal.confidence,
    reasoning: proposal.reasoning,
  }
}

/**
 * Ensure "Other" list exists for user
 */
export async function ensureOtherList(
  userId: string,
  supabase: any
): Promise<List> {
  const { data: existingList } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('name', 'Other')
    .single()

  if (existingList) {
    return existingList as List
  }

  // Get max position
  const { data: maxPosResult } = await supabase
    .from('lists')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (maxPosResult?.position ?? -1) + 1

  const { data: newList, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: 'Other',
      type: 'custom',
      icon: 'folder',
      color: '#6B7280',
      position,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create Other list: ${error.message}`)
  }

  return newList as List
}
