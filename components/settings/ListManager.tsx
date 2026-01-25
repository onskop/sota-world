'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { List } from '@/lib/supabase/types'

interface ListWithCount extends List {
  item_count?: number
}

interface ListManagerProps {
  lists: ListWithCount[]
  onRefresh: () => void
}

const ICON_OPTIONS = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'cart', label: 'Cart' },
  { value: 'film', label: 'Film' },
  { value: 'list', label: 'List' },
  { value: 'folder', label: 'Folder' },
  { value: 'star', label: 'Star' },
  { value: 'heart', label: 'Heart' },
  { value: 'book', label: 'Book' },
]

const COLOR_OPTIONS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
]

export function ListManager({ lists, onRefresh }: ListManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListIcon, setNewListIcon] = useState('folder')
  const [newListColor, setNewListColor] = useState('#6B7280')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newListName.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName.trim(),
          type: 'custom',
          icon: newListIcon,
          color: newListColor,
        }),
      })

      if (response.ok) {
        setNewListName('')
        setIsCreating(false)
        onRefresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create list')
      }
    } catch (err) {
      setError('Failed to create list')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          icon: editIcon,
          color: editColor,
        }),
      })

      if (response.ok) {
        setEditingId(null)
        onRefresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update list')
      }
    } catch (err) {
      setError('Failed to update list')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All items in this list will be deleted.`)) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/lists/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRefresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete list')
      }
    } catch (err) {
      setError('Failed to delete list')
    } finally {
      setIsLoading(false)
    }
  }

  const startEditing = (list: ListWithCount) => {
    setEditingId(list.id)
    setEditName(list.name)
    setEditIcon(list.icon || 'folder')
    setEditColor(list.color || '#6B7280')
  }

  const isSystemList = (list: ListWithCount) => list.type === 'inbox'

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Existing lists */}
      <div className="space-y-3">
        {lists.map(list => (
          <div
            key={list.id}
            className="glass-card p-4 flex items-center justify-between"
          >
            {editingId === list.id ? (
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                             text-white placeholder-slate-500 focus:border-electric focus:outline-none"
                  placeholder="List name"
                />
                <div className="flex gap-3">
                  <select
                    value={editIcon}
                    onChange={e => setEditIcon(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                               text-white focus:border-electric focus:outline-none"
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    {COLOR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setEditColor(opt.value)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editColor === opt.value ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: opt.value }}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(list.id)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-electric text-midnight rounded-lg font-medium text-sm
                               hover:bg-electric/90 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium text-sm
                               hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: list.color || '#6B7280' }}
                  >
                    <span className="text-white text-lg">
                      {list.icon === 'inbox' && '📥'}
                      {list.icon === 'cart' && '🛒'}
                      {list.icon === 'film' && '🎬'}
                      {list.icon === 'list' && '📝'}
                      {list.icon === 'folder' && '📁'}
                      {list.icon === 'star' && '⭐'}
                      {list.icon === 'heart' && '❤️'}
                      {list.icon === 'book' && '📚'}
                      {!list.icon && '📁'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{list.name}</p>
                    <p className="text-slate-500 text-sm">
                      {list.item_count || 0} items
                      {isSystemList(list) && ' • System list'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/lists/${list.id}`}
                    className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-lg
                               hover:bg-slate-600 transition-colors"
                  >
                    View
                  </Link>
                  {!isSystemList(list) && (
                    <>
                      <button
                        onClick={() => startEditing(list)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(list.id, list.name)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Create new list */}
      {isCreating ? (
        <div className="glass-card p-4 space-y-4">
          <h3 className="text-white font-medium">Create New List</h3>
          <input
            type="text"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                       text-white placeholder-slate-500 focus:border-electric focus:outline-none"
            placeholder="List name"
            autoFocus
          />
          <div className="flex gap-3">
            <select
              value={newListIcon}
              onChange={e => setNewListIcon(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                         text-white focus:border-electric focus:outline-none"
            >
              {ICON_OPTIONS.filter(o => o.value !== 'inbox').map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setNewListColor(opt.value)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    newListColor === opt.value ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isLoading || !newListName.trim()}
              className="px-4 py-2 bg-electric text-midnight rounded-lg font-medium text-sm
                         hover:bg-electric/90 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create List'}
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewListName('')
              }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium text-sm
                         hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg
                     text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
        >
          + Add New List
        </button>
      )}
    </div>
  )
}
