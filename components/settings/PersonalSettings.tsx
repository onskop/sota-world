'use client'

import { useState, useEffect } from 'react'
import type { UserSettings, VoiceLanguage } from '@/lib/supabase/types'
import { VOICE_LANGUAGE_OPTIONS } from '@/lib/supabase/types'

export function PersonalSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/personal')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save settings')
      }
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLanguageChange = (language: VoiceLanguage) => {
    if (!settings) return
    setSettings({ ...settings, voiceLanguage: language })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Failed to load settings</p>
        <button
          onClick={fetchSettings}
          className="mt-4 px-4 py-2 bg-electric text-midnight rounded-lg font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm">Settings saved successfully!</p>
        </div>
      )}

      {/* Voice Language */}
      <div className="glass-card p-4">
        <h3 className="text-white font-medium mb-3">Voice Recording Language</h3>
        <p className="text-slate-400 text-sm mb-4">
          Select the language you typically speak when recording voice notes. This improves transcription accuracy.
          Use &quot;Auto-detect&quot; if you record in multiple languages.
        </p>
        <select
          value={settings.voiceLanguage}
          onChange={e => handleLanguageChange(e.target.value as VoiceLanguage)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg
                     text-white focus:border-electric focus:outline-none"
        >
          {VOICE_LANGUAGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-electric text-midnight rounded-lg font-medium
                     hover:bg-electric/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
