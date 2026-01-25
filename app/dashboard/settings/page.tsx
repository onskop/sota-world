import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch initial lists for the ListManager
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
    list_items: undefined,
  }))

  return <SettingsClient user={user} initialLists={listsWithCounts} />
}
