'use client'

import type { ListItem } from '@/lib/supabase/types'

interface InboxItemCardProps {
  item: ListItem
  onDiscard: (id: string) => void
  onRunAction: (id: string) => void
  isDeleting?: boolean
}

export function InboxItemCard({
  item,
  onDiscard,
  onRunAction,
  isDeleting,
}: InboxItemCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="glass-card p-4 md:p-6">
      {/* Content */}
      <div className="mb-4">
        <p className="text-white text-base md:text-lg leading-relaxed">
          {item.content}
        </p>
        <p className="text-slate-500 text-xs mt-2">
          {formatDate(item.created_at)}
          {item.metadata?.source_type === 'voice' && (
            <span className="ml-2 text-electric">• Voice note</span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onDiscard(item.id)}
          disabled={isDeleting}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium
                     hover:bg-slate-600 transition-colors text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Discarding...' : 'Discard'}
        </button>
        <button
          onClick={() => onRunAction(item.id)}
          className="px-4 py-2 bg-electric text-midnight rounded-lg font-medium
                     hover:bg-electric/90 transition-colors text-sm"
        >
          Run Action
        </button>
      </div>
    </div>
  )
}
