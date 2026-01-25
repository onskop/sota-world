import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ListsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch all lists with item counts
  const { data: lists } = await supabase
    .from('lists')
    .select(`
      *,
      list_items(count)
    `)
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  const listsWithCounts = (lists || []).map(list => ({
    ...list,
    item_count: list.list_items?.[0]?.count || 0,
  }))

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-3xl font-display font-bold text-white mb-2">All Lists</h1>
        <p className="text-slate-400">Manage and organize your lists</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listsWithCounts.map(list => (
          <Link
            key={list.id}
            href={`/dashboard/lists/${list.id}`}
            className="glass-card p-6 hover:border-electric/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl
                           group-hover:scale-110 transition-transform"
                style={{ backgroundColor: list.color || '#6B7280' }}
              >
                {list.icon === 'inbox' && '📥'}
                {list.icon === 'cart' && '🛒'}
                {list.icon === 'film' && '🎬'}
                {list.icon === 'list' && '📝'}
                {list.icon === 'folder' && '📁'}
                {list.icon === 'star' && '⭐'}
                {list.icon === 'heart' && '❤️'}
                {list.icon === 'book' && '📚'}
                {!list.icon && '📁'}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium text-lg group-hover:text-electric transition-colors">
                  {list.name}
                </h3>
                <p className="text-slate-400 text-sm">
                  {list.item_count} {list.item_count === 1 ? 'item' : 'items'}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-electric transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {listsWithCounts.length === 0 && (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400 mb-4">No lists yet</p>
          <Link
            href="/dashboard/settings"
            className="px-6 py-3 bg-electric text-midnight rounded-lg font-medium
                       hover:bg-electric/90 transition-colors inline-block"
          >
            Create Your First List
          </Link>
        </div>
      )}
    </div>
  )
}
