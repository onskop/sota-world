'use client'

import { useState, useEffect } from 'react'
import type { RouterSettings as RouterSettingsType, DEFAULT_ROUTER_SETTINGS } from '@/lib/supabase/types'

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, economical)' },
  { value: 'gpt-4o', label: 'GPT-4o (Balanced)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Most capable)' },
  { value: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5 (Fast, efficient)' },
  { value: 'google/gemini-3-flash', label: 'Gemini 3 Flash (Ultra-fast)' },
  { value: 'openai/gpt-5.1-instant', label: 'GPT-5.1 Instant (Next-gen, fast)' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano (Compact)' },
  { value: 'xai/grok-4.1-fast-non-reasoning', label: 'Grok 4.1 Fast (Quick responses)' },
]

const DEFAULT_DESCRIPTIONS = {
  add_to_list: 'Add one or more items to an existing list. Use when user mentions a list name that exists.',
  create_task: 'Create a task with optional deadline. Use when user mentions a todo, reminder, or action item.',
  save_to_inbox: 'Save content to the Inbox list (default catch-all). Use for general notes, ideas, or when no other tool matches.',
}

export function RouterSettings() {
  const [settings, setSettings] = useState<RouterSettingsType | null>(null)
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
      const response = await fetch('/api/settings/router')
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
      const response = await fetch('/api/settings/router', {
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

  const handleModelChange = (model: string) => {
    if (!settings) return
    setSettings({ ...settings, model: model as RouterSettingsType['model'] })
  }

  const handleToolDescriptionChange = (tool: string, description: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      tools: {
        ...settings.tools,
        [tool]: {
          ...settings.tools[tool as keyof typeof settings.tools],
          description,
        },
      },
    })
  }

  const handleToolEnabledChange = (tool: string, enabled: boolean) => {
    if (!settings) return
    setSettings({
      ...settings,
      tools: {
        ...settings.tools,
        [tool]: {
          ...settings.tools[tool as keyof typeof settings.tools],
          enabled,
        },
      },
    })
  }

  const resetToDefaults = () => {
    setSettings({
      model: 'gpt-4o-mini',
      tools: {
        add_to_list: { description: DEFAULT_DESCRIPTIONS.add_to_list, enabled: true },
        create_task: { description: DEFAULT_DESCRIPTIONS.create_task, enabled: true },
        save_to_inbox: { description: DEFAULT_DESCRIPTIONS.save_to_inbox, enabled: true },
      },
    })
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

      {/* Model Selection */}
      <div className="glass-card p-4">
        <h3 className="text-white font-medium mb-3">AI Model</h3>
        <p className="text-slate-400 text-sm mb-4">
          Select the model used for routing and categorization.
        </p>
        <select
          value={settings.model}
          onChange={e => handleModelChange(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg
                     text-white focus:border-electric focus:outline-none"
        >
          {MODEL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tool Descriptions */}
      <div className="glass-card p-4">
        <h3 className="text-white font-medium mb-3">Tool Descriptions</h3>
        <p className="text-slate-400 text-sm mb-4">
          Customize how the AI interprets and uses each routing tool.
        </p>

        <div className="space-y-4">
          {Object.entries(settings.tools).map(([toolName, toolConfig]) => (
            <div key={toolName} className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-medium capitalize">
                  {toolName.replace(/_/g, ' ')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={toolConfig.enabled}
                    onChange={e => handleToolEnabledChange(toolName, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-electric
                               focus:ring-electric focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-400">Enabled</span>
                </label>
              </div>
              <textarea
                value={toolConfig.description}
                onChange={e => handleToolDescriptionChange(toolName, e.target.value)}
                disabled={!toolConfig.enabled}
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg
                           text-white placeholder-slate-500 focus:border-electric focus:outline-none
                           disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          Reset to Defaults
        </button>
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
