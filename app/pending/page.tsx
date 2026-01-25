import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PendingContent } from '@/components/auth/PendingContent'

export default async function PendingApprovalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is now approved
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_status, is_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_admin || profile?.account_status === 'approved') {
    redirect('/')
  }

  return <PendingContent userEmail={user.email || ''} />
}
