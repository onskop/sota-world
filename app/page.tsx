import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { VoiceWorkflowDashboard } from '@/components/dashboard/VoiceWorkflowDashboard'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, show landing page
  if (!user) {
    return (
      <main className="main-wrapper flex flex-col items-center justify-center min-h-screen">
        <div className="glass-card p-10 max-w-2xl text-center">
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            Smart Notepad
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Your AI-powered personal knowledge hub. Capture thoughts by voice or text,
            organize with categories, and unlock powerful AI actions.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 bg-electric text-midnight rounded-lg font-medium
                         hover:bg-electric/90 transition-colors"
            >
              Get Started
            </Link>
          </div>

          <p className="text-sm text-slate-500 mt-6">
            Currently in private beta
          </p>
        </div>
      </main>
    )
  }

  // Check user profile status
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

  // User is approved - show workflow dashboard
  return <VoiceWorkflowDashboard user={user} />
}
