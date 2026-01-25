'use client'

import type { ListItem, ItemProposal } from '@/lib/supabase/types'

interface InboxItemCardProps {
  item: ListItem
  onDiscard: (id: string) => void
  onPropose: (id: string) => void
  onConfirm: (id: string) => void
  onDismissProposal: (id: string) => void
  isDeleting?: boolean
  isProposing?: boolean
  isConfirming?: boolean
}

export function InboxItemCard({
  item,
  onDiscard,
  onPropose,
  onConfirm,
  onDismissProposal,
  isDeleting,
  isProposing,
  isConfirming,
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

  const proposal = item.metadata?.proposal as ItemProposal | undefined
  const hasProposal = proposal && proposal.status === 'pending'

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

      {/* Proposal Preview */}
      {hasProposal && (
        <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-400">PROPOSED ACTION</span>
            <span className="px-2 py-0.5 bg-electric/20 text-electric text-xs rounded">
              → {proposal.target_list_name}
            </span>
          </div>
          <p className="text-white text-sm">
            {proposal.reformulated_content}
          </p>
          {proposal.original_content !== proposal.reformulated_content && (
            <p className="text-slate-500 text-xs mt-1 line-through">
              Original: {proposal.original_content}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!hasProposal ? (
          <>
            <button
              onClick={() => onDiscard(item.id)}
              disabled={isDeleting || isProposing}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium
                         hover:bg-slate-600 transition-colors text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Discarding...' : 'Discard'}
            </button>
            <button
              onClick={() => onPropose(item.id)}
              disabled={isProposing || isDeleting}
              className="px-4 py-2 bg-electric text-midnight rounded-lg font-medium
                         hover:bg-electric/90 transition-colors text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProposing ? 'Proposing...' : 'Propose Action'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onConfirm(item.id)}
              disabled={isConfirming}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium
                         hover:bg-green-500 transition-colors text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? 'Confirming...' : 'Confirm'}
            </button>
            <button
              onClick={() => onPropose(item.id)}
              disabled={isProposing}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium
                         hover:bg-slate-600 transition-colors text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProposing ? 'Re-running...' : 'Re-run'}
            </button>
            <button
              onClick={() => onDismissProposal(item.id)}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium
                         hover:bg-slate-600 transition-colors text-sm"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  )
}
