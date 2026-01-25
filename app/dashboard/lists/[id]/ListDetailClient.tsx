'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { List, ListItem } from '@/lib/supabase/types'
import Link from 'next/link'

interface ListWithItems extends List {
  list_items?: ListItem[]
}

interface ListDetailClientProps {
  user: User
  list: ListWithItems
}

export function ListDetailClient({ user, list: initialList }: ListDetailClientProps) {
  const [items, setItems] = useState<ListItem[]>(initialList.list_items || [])
  const [showCompleted, setShowCompleted] = useState(false)
  const [newItemContent, setNewItemContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const displayedItems = showCompleted
    ? items
    : items.filter(item => !item.is_checked)

  const completedCount = items.filter(item => item.is_checked).length

  const handleAddItem = async () => {
    if (!newItemContent.trim()) return

    setIsAdding(true)
    try {
      // Get max position
      const maxPosition = items.reduce((max, item) => Math.max(max, item.position), -1)

      const response = await fetch('/api/list-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: initialList.id,
          content: newItemContent.trim(),
          position: maxPosition + 1,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setItems([...items, data.item])
        setNewItemContent('')
      }
    } catch (err) {
      console.error('Error adding item:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleCheck = async (itemId: string, currentChecked: boolean) => {
    try {
      const response = await fetch(`/api/list-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_checked: !currentChecked }),
      })

      if (response.ok) {
        setItems(items.map(item =>
          item.id === itemId ? { ...item, is_checked: !currentChecked } : item
        ))
      }
    } catch (err) {
      console.error('Error toggling item:', err)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item permanently?')) return

    try {
      const response = await fetch(`/api/list-items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId))
      }
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  const handleDeleteAllCompleted = async () => {
    const completedItems = items.filter(item => item.is_checked)
    if (completedItems.length === 0) return

    if (!confirm(`Delete all ${completedItems.length} completed items?`)) return

    try {
      await Promise.all(
        completedItems.map(item =>
          fetch(`/api/list-items/${item.id}`, { method: 'DELETE' })
        )
      )
      setItems(items.filter(item => !item.is_checked))
    } catch (err) {
      console.error('Error deleting completed items:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/5 bg-midnight/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-2">
            {initialList.icon && (
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: initialList.color || '#6B7280' }}
              >
                {initialList.icon === 'inbox' && '📥'}
                {initialList.icon === 'cart' && '🛒'}
                {initialList.icon === 'film' && '🎬'}
                {initialList.icon === 'list' && '📝'}
                {initialList.icon === 'folder' && '📁'}
                {initialList.icon === 'star' && '⭐'}
                {initialList.icon === 'heart' && '❤️'}
                {initialList.icon === 'book' && '📚'}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-display font-bold text-white">{initialList.name}</h1>
              <p className="text-slate-400 text-sm">
                {items.length} total • {completedCount} completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-6 pb-8">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Add new item */}
          <div className="glass-card p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newItemContent}
                onChange={e => setNewItemContent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                placeholder="Add new item..."
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg
                           text-white placeholder-slate-500 focus:border-electric focus:outline-none"
              />
              <button
                onClick={handleAddItem}
                disabled={isAdding || !newItemContent.trim()}
                className="px-6 py-2 bg-electric text-midnight rounded-lg font-medium
                           hover:bg-electric/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={e => setShowCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-electric
                           focus:ring-electric focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">
                Show completed ({completedCount})
              </span>
            </label>

            {completedCount > 0 && (
              <button
                onClick={handleDeleteAllCompleted}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Delete all completed
              </button>
            )}
          </div>

          {/* Items list */}
          <div className="space-y-2">
            {displayedItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">
                  {items.length === 0 ? 'No items yet. Add your first item above.' : 'No items to show'}
                </p>
              </div>
            ) : (
              displayedItems.map(item => (
                <div
                  key={item.id}
                  className="glass-card p-4 flex items-center gap-4 group"
                >
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggleCheck(item.id, item.is_checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-electric
                               focus:ring-electric focus:ring-offset-0 cursor-pointer"
                  />
                  <p
                    className={`flex-1 text-white ${
                      item.is_checked ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {item.content}
                  </p>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400
                               transition-all"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
