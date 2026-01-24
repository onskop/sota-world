'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

export function DashboardHeader({ user }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <header className="border-b border-slate-800/50 bg-midnight/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="main-wrapper py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-display font-semibold text-white">
            Smart Notepad
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-slate-300 hidden sm:inline">
              {displayName}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white
                       border border-slate-700 rounded-lg hover:border-slate-600
                       transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
