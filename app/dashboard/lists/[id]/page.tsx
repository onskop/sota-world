import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListDetailClient } from './ListDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ListDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch list with items
  const { data: list } = await supabase
    .from('lists')
    .select(`
      *,
      list_items(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!list) {
    redirect('/')
  }

  return <ListDetailClient user={user} list={list} />
}
