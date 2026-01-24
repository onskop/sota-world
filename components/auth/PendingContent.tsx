'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PendingContentProps {
  userEmail: string
}

export function PendingContent({ userEmail }: PendingContentProps) {
  const router = useRouter()

  const handleRefresh = () => {
    router.refresh()
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="main-wrapper flex flex-col items-center justify-center min-h-screen">
      <div className="glass-card p-10 max-w-2xl text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sunrise/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-sunrise"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-3">
            Waiting for Approval
          </h1>
          <p className="text-lg text-slate-300">
            Your account is pending admin approval
          </p>
        </div>

        <div className="bg-midnight/40 border border-slate-700 rounded-lg p-6 mb-6">
          <p className="text-slate-400 mb-4">
            Smart Notepad is currently in private beta. An administrator will review your
            request and grant access soon.
          </p>
          <div className="text-sm text-slate-500">
            <p className="mb-2">You&apos;ll be notified via email when your account is approved.</p>
            <p>Check back later or refresh this page.</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRefresh}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg
                       transition-colors"
          >
            Refresh Status
          </button>
          <button
            onClick={handleSignOut}
            className="px-6 py-2.5 border border-slate-700 hover:border-slate-600
                       text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>

        <p className="text-xs text-slate-600 mt-6">
          Signed in as {userEmail}
        </p>
      </div>
    </main>
  )
}
