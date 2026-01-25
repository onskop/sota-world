'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

export function DashboardHeader({ user }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleHeaderClick = () => {
    // Navigate to root (main dashboard) to reset workflow
    if (pathname !== '/') {
      router.push('/')
      router.refresh()
    } else {
      // If already on root, reload to reset state
      window.location.href = '/'
    }
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  return (
    <header className="border-b border-slate-800/50 bg-midnight/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="main-wrapper py-4 flex items-center justify-between">
        <div className="flex-1 flex justify-center">
          <button
            onClick={handleHeaderClick}
            className="text-xl font-display font-semibold text-white hover:text-electric transition-colors cursor-pointer"
          >
            Smart Notepad AI Agent
          </button>
        </div>

        <div className="flex-1 flex items-center justify-end gap-4">
          <Link
            href="/dashboard/settings"
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

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
