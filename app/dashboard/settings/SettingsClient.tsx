'use client'

import { useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import type { List } from '@/lib/supabase/types'
import { ListManager } from '@/components/settings/ListManager'
import { RouterSettings } from '@/components/settings/RouterSettings'
import { PersonalSettings } from '@/components/settings/PersonalSettings'
import Link from 'next/link'

interface ListWithCount extends List {
  item_count?: number
}

interface SettingsClientProps {
  user: User
  initialLists: ListWithCount[]
}

type Tab = 'personal' | 'lists' | 'router'

export function SettingsClient({ user, initialLists }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [lists, setLists] = useState<ListWithCount[]>(initialLists)

  const fetchLists = useCallback(async () => {
    try {
      const response = await fetch('/api/lists')
      if (response.ok) {
        const data = await response.json()
        setLists(data.lists || [])
      }
    } catch (err) {
      console.error('Error fetching lists:', err)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Back link and title */}
      <div className="border-b border-white/5 bg-midnight/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-[73px] left-0 right-0 z-10 bg-midnight/80 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'personal'
                  ? 'text-electric border-electric'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'lists'
                  ? 'text-electric border-electric'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => setActiveTab('router')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'router'
                  ? 'text-electric border-electric'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Router Agent
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-6 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {activeTab === 'personal' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-white mb-2">
                  Personal Settings
                </h2>
                <p className="text-slate-400 text-sm">
                  Configure your personal preferences for voice recording and transcription.
                </p>
              </div>
              <PersonalSettings />
            </div>
          )}

          {activeTab === 'lists' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-white mb-2">
                  Manage Lists
                </h2>
                <p className="text-slate-400 text-sm">
                  Create and organize your lists. Items from the inbox can be categorized into these lists.
                </p>
              </div>
              <ListManager lists={lists} onRefresh={fetchLists} />
            </div>
          )}

          {activeTab === 'router' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-display font-bold text-white mb-2">
                  Router Agent Settings
                </h2>
                <p className="text-slate-400 text-sm">
                  Configure the AI model and tool descriptions used for routing and categorizing your notes.
                </p>
              </div>
              <RouterSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
