'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkflowStep } from './WorkflowStep'
import { HoldToRecordButton } from '../voice/HoldToRecordButton'
import { InboxItemCard } from './InboxItemCard'
import type { User } from '@supabase/supabase-js'
import type { ListItem } from '@/lib/supabase/types'

interface VoiceWorkflowDashboardProps {
  user: User
}

type Tab = 'record' | 'inbox'

type WorkflowState =
  | 'INITIAL'
  | 'RECORDING'
  | 'RECORDED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'SAVING'
  | 'SAVED'

export function VoiceWorkflowDashboard({ user }: VoiceWorkflowDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('record')

  // Recording workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState>('INITIAL')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState('')
  const [editedTranscription, setEditedTranscription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inbox state
  const [inboxItems, setInboxItems] = useState<ListItem[]>([])
  const [isLoadingInbox, setIsLoadingInbox] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // Fetch inbox items when switching to inbox tab
  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchInboxItems()
    }
  }, [activeTab])

  const fetchInboxItems = async () => {
    setIsLoadingInbox(true)
    try {
      const response = await fetch('/api/inbox')
      if (response.ok) {
        const data = await response.json()
        setInboxItems(data.items || [])
      }
    } catch (err) {
      console.error('Error fetching inbox:', err)
    } finally {
      setIsLoadingInbox(false)
    }
  }

  const handleRecordingComplete = useCallback((blob: Blob, dur: number) => {
    console.log('Recording complete:', { blobSize: blob.size, duration: dur })
    setAudioBlob(blob)
    setWorkflowState('RECORDED')
    setError(null)
  }, [])

  const handleTranscribe = useCallback(async () => {
    console.log('handleTranscribe called, audioBlob:', audioBlob?.size)
    if (!audioBlob) {
      console.log('No audioBlob, skipping transcription')
      return
    }

    setWorkflowState('TRANSCRIBING')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      console.log('Sending transcription request...')

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      console.log('Transcription response:', data)
      const transcribedText = data.transcription || data.recording?.transcription || ''
      setTranscription(transcribedText)
      setEditedTranscription(transcribedText)
      setWorkflowState('TRANSCRIBED')
    } catch (err) {
      console.error('Transcription error:', err)
      setError('Failed to transcribe audio. Please try again.')
      setWorkflowState('RECORDED')
    }
  }, [audioBlob])

  // Auto-transcribe when recording completes
  useEffect(() => {
    if (workflowState === 'RECORDED' && audioBlob) {
      handleTranscribe()
    }
  }, [workflowState, audioBlob, handleTranscribe])

  const handleSaveToInbox = async () => {
    setWorkflowState('SAVING')
    setError(null)

    try {
      const textToSave = editedTranscription || transcription

      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textToSave,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save to inbox')
      }

      setWorkflowState('SAVED')
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save note. Please try again.')
      setWorkflowState('TRANSCRIBED')
    }
  }

  const handleReset = () => {
    setWorkflowState('INITIAL')
    setAudioBlob(null)
    setTranscription('')
    setEditedTranscription('')
    setIsEditing(false)
    setError(null)
  }

  const handleRecordingStepTap = () => {
    if (workflowState !== 'INITIAL' && workflowState !== 'RECORDING') {
      handleReset()
    }
  }

  const handleTranscriptionStepTap = () => {
    if (workflowState === 'TRANSCRIBED' || workflowState === 'SAVING' || workflowState === 'SAVED') {
      setIsEditing(true)
    }
  }

  const handleDiscardItem = async (itemId: string) => {
    setDeletingItemId(itemId)
    try {
      const response = await fetch(`/api/inbox?id=${itemId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setInboxItems(items => items.filter(item => item.id !== itemId))
      }
    } catch (err) {
      console.error('Error deleting item:', err)
    } finally {
      setDeletingItemId(null)
    }
  }

  const handleRunAction = (itemId: string) => {
    // Placeholder - will be implemented later
    console.log('Run action for item:', itemId)
    alert('Run Action feature coming soon!')
  }

  // Step visibility states
  const isRecordStepActive = workflowState === 'INITIAL' || workflowState === 'RECORDING'
  const isRecordStepCompleted = workflowState !== 'INITIAL' && workflowState !== 'RECORDING'
  const isRecordStepPending = false

  const isTranscribeStepActive = workflowState === 'RECORDED' || workflowState === 'TRANSCRIBING'
  const isTranscribeStepCompleted = workflowState === 'TRANSCRIBED' || workflowState === 'SAVING' || workflowState === 'SAVED'
  const isTranscribeStepPending = workflowState === 'INITIAL' || workflowState === 'RECORDING'

  const isSaveStepActive = workflowState === 'TRANSCRIBED' || workflowState === 'SAVING' || workflowState === 'SAVED'
  const isSaveStepCompleted = false
  const isSaveStepPending = workflowState === 'INITIAL' || workflowState === 'RECORDING' || workflowState === 'RECORDED' || workflowState === 'TRANSCRIBING'

  return (
    <main className="min-h-screen">
      {/* Header with user info */}
      <div className="fixed top-0 left-0 right-0 z-10 glass-card border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-white">Smart Notepad</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 hidden sm:inline">
              {user.user_metadata?.name || user.email}
            </span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="fixed top-14 left-0 right-0 z-10 bg-midnight/80 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('record')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'record'
                  ? 'text-electric border-electric'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Record
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'inbox'
                  ? 'text-electric border-electric'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Inbox
              {inboxItems.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-electric/20 text-electric text-xs rounded-full">
                  {inboxItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-28 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Record Tab */}
          {activeTab === 'record' && (
            <>
              {/* Step 1: Record */}
              <WorkflowStep
                step={1}
                title="Record"
                isActive={isRecordStepActive}
                isCompleted={isRecordStepCompleted}
                isPending={isRecordStepPending}
              >
                <HoldToRecordButton
                  onRecordingComplete={handleRecordingComplete}
                  isActive={isRecordStepActive}
                  isCompleted={isRecordStepCompleted}
                  onTap={handleRecordingStepTap}
                />
              </WorkflowStep>

              {/* Step 2: Transcribe */}
              <WorkflowStep
                step={2}
                title="Transcribe"
                isActive={isTranscribeStepActive}
                isCompleted={isTranscribeStepCompleted}
                isPending={isTranscribeStepPending}
              >
                {workflowState === 'TRANSCRIBING' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-electric border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-300 text-lg">Transcribing audio...</p>
                  </div>
                )}

                {(workflowState === 'TRANSCRIBED' || workflowState === 'SAVING' || workflowState === 'SAVED') && (
                  <div
                    className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:border-electric/50 transition-colors"
                    onClick={handleTranscriptionStepTap}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <textarea
                          value={editedTranscription}
                          onChange={(e) => setEditedTranscription(e.target.value)}
                          className="w-full min-h-[120px] bg-midnight/50 text-white p-4 rounded-lg border border-slate-700 focus:border-electric focus:outline-none resize-none"
                          placeholder="Edit transcription..."
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsEditing(false)
                            }}
                            className="px-4 py-2 bg-electric text-midnight rounded-lg font-medium hover:bg-electric/90 transition-colors"
                          >
                            Save Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditedTranscription(transcription)
                              setIsEditing(false)
                            }}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-white text-lg leading-relaxed">
                          {editedTranscription || transcription}
                        </p>
                        <p className="text-slate-400 text-sm">Tap to edit</p>
                      </div>
                    )}
                  </div>
                )}
              </WorkflowStep>

              {/* Step 3: Save */}
              <WorkflowStep
                step={3}
                title="Save to Inbox"
                isActive={isSaveStepActive}
                isCompleted={isSaveStepCompleted}
                isPending={isSaveStepPending}
              >
                {workflowState === 'TRANSCRIBED' && (
                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={handleSaveToInbox}
                      className="px-12 py-6 md:px-16 md:py-8 bg-electric text-midnight rounded-lg
                                 hover:bg-electric/90 active:bg-electric/80 transition-colors
                                 text-xl md:text-2xl font-display font-medium"
                    >
                      Save to Inbox
                    </button>
                  </div>
                )}

                {workflowState === 'SAVING' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-electric border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-300 text-lg">Saving...</p>
                  </div>
                )}

                {workflowState === 'SAVED' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-xl mb-2">Saved to Inbox!</h3>
                          <p className="text-slate-300">
                            Your note is now in the inbox. Go to the Inbox tab to decide what to do with it.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleReset}
                        className="flex-1 py-4 bg-electric text-midnight rounded-lg font-medium text-lg hover:bg-electric/90 transition-colors"
                      >
                        Record Another
                      </button>
                      <button
                        onClick={() => {
                          handleReset()
                          setActiveTab('inbox')
                        }}
                        className="flex-1 py-4 bg-slate-700 text-white rounded-lg font-medium text-lg hover:bg-slate-600 transition-colors"
                      >
                        View Inbox
                      </button>
                    </div>
                  </div>
                )}
              </WorkflowStep>

              {/* Error display */}
              {error && (
                <div className="fixed bottom-8 left-4 right-4 max-w-md mx-auto">
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-red-400">{error}</p>
                      </div>
                      <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-white">Inbox</h2>
                <button
                  onClick={fetchInboxItems}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Refresh
                </button>
              </div>

              {isLoadingInbox && (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="w-12 h-12 border-4 border-electric border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-300">Loading inbox...</p>
                </div>
              )}

              {!isLoadingInbox && inboxItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Inbox is empty</h3>
                  <p className="text-slate-400 mb-6">Record a voice note to get started</p>
                  <button
                    onClick={() => setActiveTab('record')}
                    className="px-6 py-3 bg-electric text-midnight rounded-lg font-medium hover:bg-electric/90 transition-colors"
                  >
                    Record Note
                  </button>
                </div>
              )}

              {!isLoadingInbox && inboxItems.length > 0 && (
                <div className="space-y-4">
                  {inboxItems.map(item => (
                    <InboxItemCard
                      key={item.id}
                      item={item}
                      onDiscard={handleDiscardItem}
                      onRunAction={handleRunAction}
                      isDeleting={deletingItemId === item.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
