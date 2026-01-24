/**
 * Router Tools - Intelligent routing for voice commands
 * 4 tools: add_to_list, create_list, create_task, save_to_inbox
 *
 * Compatible with Vercel AI SDK v6
 */

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

// =====================================================
// Zod Schemas for tool parameters
// =====================================================

const addToListSchema = z.object({
  list_id: z.string().describe('UUID of the target list'),
  list_name: z.string().describe('Name of the list (for confirmation message)'),
  items: z.array(z.string()).min(1).describe('Array of items to add to the list'),
})

const createListSchema = z.object({
  name: z.string().min(1).max(100).describe('Name of the new list'),
  type: z.enum(['inbox', 'shopping', 'movies', 'custom'])
    .describe('List type: inbox (general), shopping (groceries), movies (watchlist), custom (user-defined)'),
  items: z.array(z.string()).optional().describe('Optional initial items to add to the new list'),
})

const createTaskSchema = z.object({
  content: z.string().min(1).describe('Task description/title'),
  description: z.string().optional().describe('Optional detailed description'),
  due_date: z.string().optional().describe('ISO 8601 date string (e.g., "2026-01-25T18:00:00Z"). Only set if user mentions a specific date or deadline.'),
  priority: z.enum(['low', 'medium', 'high']).optional().describe('Task priority level'),
})

const saveToInboxSchema = z.object({
  content: z.string().min(1).describe('Content to save to inbox'),
})

// Type aliases for parameters
type AddToListParams = z.infer<typeof addToListSchema>
type CreateListParams = z.infer<typeof createListSchema>
type CreateTaskParams = z.infer<typeof createTaskSchema>
type SaveToInboxParams = z.infer<typeof saveToInboxSchema>

// =====================================================
// Factory function to create tools with bound context
// =====================================================

export function createRouterTools(userId: string, supabase: SupabaseClient) {
  return {
    add_to_list: {
      description: 'Add one or more items to an existing list. Use when user mentions a list name that exists.',
      inputSchema: addToListSchema,
      execute: async ({ list_id, list_name, items }: AddToListParams) => {
        try {
          const { count } = await supabase
            .from('list_items')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list_id)

          const startPosition = count || 0

          const itemsToInsert = items.map((content: string, idx: number) => ({
            list_id,
            user_id: userId,
            content: content.trim(),
            position: startPosition + idx,
            is_checked: false,
            metadata: {
              source_type: 'voice',
              created_via: 'router_agent',
            },
          }))

          const { data, error } = await supabase
            .from('list_items')
            .insert(itemsToInsert)
            .select()

          if (error) {
            console.error('Error adding items to list:', error)
            throw new Error(`Failed to add items: ${error.message}`)
          }

          return {
            success: true,
            list_name,
            items_added: data.length,
            items_preview: items.slice(0, 3),
            message: `Added ${data.length} item(s) to "${list_name}"`,
          }
        } catch (error) {
          console.error('addToListTool error:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    },

    create_list: {
      description: 'Create a brand new list and optionally add initial items. Use when user wants to create a new category or list type.',
      inputSchema: createListSchema,
      execute: async ({ name, type, items }: CreateListParams) => {
        try {
          const { data: existingList } = await supabase
            .from('lists')
            .select('id, name')
            .eq('user_id', userId)
            .eq('name', name)
            .single()

          if (existingList) {
            return {
              success: false,
              error: `List "${name}" already exists. Use add_to_list tool instead.`,
              existing_list_id: existingList.id,
            }
          }

          const { count: listCount } = await supabase
            .from('lists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

          const position = listCount || 0

          const { data: newList, error: listError } = await supabase
            .from('lists')
            .insert({
              user_id: userId,
              name,
              type,
              position,
              icon: type === 'shopping' ? 'cart' : type === 'movies' ? 'film' : type === 'inbox' ? 'inbox' : 'list',
            })
            .select()
            .single()

          if (listError) {
            console.error('Error creating list:', listError)
            throw new Error(`Failed to create list: ${listError.message}`)
          }

          let itemsAdded = 0
          if (items && items.length > 0) {
            const itemsToInsert = items.map((content: string, idx: number) => ({
              list_id: newList.id,
              user_id: userId,
              content: content.trim(),
              position: idx,
              is_checked: false,
              metadata: {
                source_type: 'voice',
                created_via: 'router_agent',
              },
            }))

            const { data: insertedItems, error: itemsError } = await supabase
              .from('list_items')
              .insert(itemsToInsert)
              .select()

            if (!itemsError && insertedItems) {
              itemsAdded = insertedItems.length
            }
          }

          return {
            success: true,
            list_id: newList.id,
            list_name: name,
            list_type: type,
            items_added: itemsAdded,
            message: `Created new list "${name}"${itemsAdded > 0 ? ` with ${itemsAdded} items` : ''}`,
          }
        } catch (error) {
          console.error('createListTool error:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    },

    create_task: {
      description: 'Create a task with optional deadline. Use when user mentions a todo, reminder, or action item with a deadline.',
      inputSchema: createTaskSchema,
      execute: async ({ content, description, due_date, priority }: CreateTaskParams) => {
        try {
          const { count: taskCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'pending')

          const position = taskCount || 0

          const { data, error } = await supabase
            .from('tasks')
            .insert({
              user_id: userId,
              content: content.trim(),
              description: description?.trim() || null,
              due_date: due_date || null,
              priority: priority || 'medium',
              status: 'pending',
              position,
            })
            .select()
            .single()

          if (error) {
            console.error('Error creating task:', error)
            throw new Error(`Failed to create task: ${error.message}`)
          }

          let dueDateMessage = ''
          if (due_date) {
            const date = new Date(due_date)
            dueDateMessage = ` due ${date.toLocaleDateString()}`
          }

          return {
            success: true,
            task_id: data.id,
            content: data.content,
            due_date: data.due_date,
            priority: data.priority,
            message: `Task created${dueDateMessage}`,
          }
        } catch (error) {
          console.error('createTaskTool error:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    },

    save_to_inbox: {
      description: 'Save content to the Inbox list (default catch-all). Use for general notes, ideas, thoughts, or when no other tool matches.',
      inputSchema: saveToInboxSchema,
      execute: async ({ content }: SaveToInboxParams) => {
        try {
          let { data: inboxList } = await supabase
            .from('lists')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'inbox')
            .single()

          if (!inboxList) {
            const { data: newInbox, error: createError } = await supabase
              .from('lists')
              .insert({
                user_id: userId,
                name: 'Inbox',
                type: 'inbox',
                icon: 'inbox',
                position: 0,
              })
              .select()
              .single()

            if (createError) {
              throw new Error(`Failed to create inbox: ${createError.message}`)
            }

            inboxList = newInbox
          }

          const { count } = await supabase
            .from('list_items')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', inboxList!.id)

          const position = count || 0

          const { data, error } = await supabase
            .from('list_items')
            .insert({
              list_id: inboxList!.id,
              user_id: userId,
              content: content.trim(),
              position,
              is_checked: false,
              metadata: {
                source_type: 'voice',
                created_via: 'router_agent',
              },
            })
            .select()
            .single()

          if (error) {
            console.error('Error saving to inbox:', error)
            throw new Error(`Failed to save to inbox: ${error.message}`)
          }

          return {
            success: true,
            item_id: data.id,
            content: data.content,
            message: 'Saved to Inbox',
          }
        } catch (error) {
          console.error('saveToInboxTool error:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      },
    },
  }
}
