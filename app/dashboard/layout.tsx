import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is approved
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_status, is_admin')
    .eq('id', user.id)
    .single()

  // Redirect pending users to pending page
  if (profile && !profile.is_admin && profile.account_status === 'pending') {
    redirect('/pending')
  }

  // Redirect rejected users to login with error
  if (profile && profile.account_status === 'rejected') {
    redirect('/login?error=account_rejected')
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader user={user} />
      <main className="main-wrapper pt-4">
        {children}
      </main>
    </div>
  )
}
