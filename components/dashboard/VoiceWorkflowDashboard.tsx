'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkflowStep } from './WorkflowStep'
import { HoldToRecordButton } from '../voice/HoldToRecordButton'
import { TranscriptionViewer } from '../voice/TranscriptionViewer'
import { InboxItemCard } from './InboxItemCard'
import { DashboardHeader } from './Header'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import type { ListItem, List } from '@/lib/supabase/types'

interface VoiceWorkflowDashboardProps {
  user: User
}

type Tab = 'record' | 'inbox' | 'lists'

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
  const [isManualNote, setIsManualNote] = useState(false)
  const [voiceRecordingId, setVoiceRecordingId] = useState<string | null>(null)

  // Inbox state
  const [inboxItems, setInboxItems] = useState<ListItem[]>([])
  const [isLoadingInbox, setIsLoadingInbox] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [proposingItemId, setProposingItemId] = useState<string | null>(null)
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null)
  const [isBulkProposing, setIsBulkProposing] = useState(false)

  // Lists state
  const [lists, setLists] = useState<Array<List & { item_count: number }>>([])
  const [isLoadingLists, setIsLoadingLists] = useState(false)

  // Fetch inbox items when switching to inbox tab
  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchInboxItems()
    }
  }, [activeTab])

  // Fetch lists when switching to lists tab
  useEffect(() => {
    if (activeTab === 'lists') {
      fetchLists()
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

  const fetchLists = async () => {
    setIsLoadingLists(true)
    try {
      const response = await fetch('/api/lists')
      if (response.ok) {
        const data = await response.json()
        setLists(data.lists || [])
      }
    } catch (err) {
      console.error('Error fetching lists:', err)
    } finally {
      setIsLoadingLists(false)
    }
  }

  const handleRecordingComplete = useCallback((blob: Blob, dur: number) => {
    console.log('Recording complete:', { blobSize: blob.size, duration: dur })
    setAudioBlob(blob)
    setWorkflowState('RECORDED')
    setError(null)
    setIsManualNote(false)
  }, [])

  const handleTypeNote = () => {
    setTranscription('')
    setEditedTranscription('')
    setAudioBlob(null)
    setVoiceRecordingId(null)
    setIsManualNote(true)
    setError(null)
    setWorkflowState('TRANSCRIBED') // Skip directly to transcription step
    setIsEditing(true)
  }

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
      setVoiceRecordingId(data.recording?.id || null)
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
    const textToSave = (editedTranscription || transcription || '').trim()
    
    if (!textToSave) {
      setError('Please enter some content before saving.')
      return
    }

    setWorkflowState('SAVING')
    setError(null)

    try {
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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save to inbox')
      }

      setWorkflowState('SAVED')
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save note. Please try again.')
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
    setIsManualNote(false)
    setVoiceRecordingId(null)
  }

  const handleEditTranscription = (newText: string) => {
    setEditedTranscription(newText)
    setTranscription(newText)
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

  const handleProposeAction = async (itemId: string) => {
    setProposingItemId(itemId)
    try {
      const response = await fetch('/api/inbox/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Update item in state with new proposal
        setInboxItems(items =>
          items.map(item =>
            item.id === itemId
              ? { ...item, metadata: { ...item.metadata, proposal: data.proposal } }
              : item
          )
        )
      } else {
        const error = await response.json()
        console.error('Propose error:', error)
      }
    } catch (err) {
      console.error('Error proposing action:', err)
    } finally {
      setProposingItemId(null)
    }
  }

  const handleConfirmAction = async (itemId: string) => {
    setConfirmingItemId(itemId)
    try {
      const response = await fetch('/api/inbox/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })

      if (response.ok) {
        // Remove confirmed item from inbox
        setInboxItems(items => items.filter(item => item.id !== itemId))
      } else {
        const error = await response.json()
        console.error('Confirm error:', error)
      }
    } catch (err) {
      console.error('Error confirming action:', err)
    } finally {
      setConfirmingItemId(null)
    }
  }

  const handleDismissProposal = (itemId: string) => {
    // Remove proposal from item metadata locally
    setInboxItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, metadata: { ...item.metadata, proposal: undefined } }
          : item
      )
    )
  }

  const handleProposeAll = async () => {
    setIsBulkProposing(true)
    try {
      const response = await fetch('/api/inbox/propose-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        // Refresh inbox to get updated proposals
        await fetchInboxItems()
      } else {
        const error = await response.json()
        console.error('Bulk propose error:', error)
      }
    } catch (err) {
      console.error('Error in bulk propose:', err)
    } finally {
      setIsBulkProposing(false)
    }
  }

  // Step visibility states
  const isRecordStepActive = (workflowState === 'INITIAL' || workflowState === 'RECORDING') && !isManualNote
  const isRecordStepCompleted = (workflowState !== 'INITIAL' && workflowState !== 'RECORDING') || isManualNote
  const isRecordStepPending = false

  const isTranscribeStepActive = workflowState === 'RECORDED' || workflowState === 'TRANSCRIBING' || (isManualNote && workflowState === 'TRANSCRIBED')
  const isTranscribeStepCompleted = workflowState === 'TRANSCRIBED' || workflowState === 'SAVING' || workflowState === 'SAVED'
  const isTranscribeStepPending = (workflowState === 'INITIAL' || workflowState === 'RECORDING') && !isManualNote

  const isSaveStepActive = workflowState === 'TRANSCRIBED' || workflowState === 'SAVING' || workflowState === 'SAVED'
  const isSaveStepCompleted = false
  const isSaveStepPending = (workflowState === 'INITIAL' || workflowState === 'RECORDING' || workflowState === 'RECORDED' || workflowState === 'TRANSCRIBING') && !isManualNote

  return (
    <main className="min-h-screen">
      <DashboardHeader user={user} />

      {/* Tab Navigation */}
      <div className="sticky top-[73px] left-0 right-0 z-10 bg-midnight/80 backdrop-blur-sm border-b border-white/5">
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
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-4 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Record Tab */}
          {activeTab === 'record' && (
            <>
              {/* Step 1: Record */}
              <WorkflowStep
                step={1}
                title={isManualNote ? 'Type Note' : 'Record'}
                isActive={isRecordStepActive}
                isCompleted={isRecordStepCompleted}
                isPending={isRecordStepPending}
              >
                {!isManualNote ? (
                  <>
                    <HoldToRecordButton
                      onRecordingComplete={handleRecordingComplete}
                      isActive={isRecordStepActive}
                      isCompleted={isRecordStepCompleted}
                      onTap={handleRecordingStepTap}
                    />
                    {isRecordStepActive && (
                      <div className="pt-4 border-t border-slate-700 mt-6 flex justify-center">
                        <button
                          onClick={handleTypeNote}
                          className="px-12 py-6 md:px-16 md:py-8 bg-electric text-midnight font-medium rounded-lg
                                     hover:bg-electric/90 active:bg-electric/80 transition-colors
                                     text-xl md:text-2xl font-display flex items-center gap-3"
                        >
                          <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Type Note
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <TranscriptionViewer
                    transcription={transcription}
                    onEdit={handleEditTranscription}
                    onChange={handleEditTranscription}
                    editable
                  />
                )}
              </WorkflowStep>

              {/* Step 2: Transcribe (hidden for manual notes) */}
              {!isManualNote && (
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
                    <TranscriptionViewer
                      transcription={editedTranscription || transcription}
                      onEdit={handleEditTranscription}
                      onChange={handleEditTranscription}
                      editable
                    />
                  )}
                </WorkflowStep>
              )}

              {/* Step 3: Save (Step 2 for manual notes) */}
              <WorkflowStep
                step={isManualNote ? 2 : 3}
                title="Save to Inbox"
                isActive={isSaveStepActive}
                isCompleted={isSaveStepCompleted}
                isPending={isSaveStepPending}
              >
                {workflowState === 'TRANSCRIBED' && (
                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={handleSaveToInbox}
                      disabled={!(editedTranscription || transcription || '').trim()}
                      className="px-12 py-6 md:px-16 md:py-8 bg-electric text-midnight rounded-lg
                                 hover:bg-electric/90 active:bg-electric/80 transition-colors
                                 text-xl md:text-2xl font-display font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="flex items-center gap-3">
                  {inboxItems.length > 0 && (
                    <button
                      onClick={handleProposeAll}
                      disabled={isBulkProposing}
                      className="px-4 py-2 bg-electric text-midnight rounded-lg font-medium text-sm
                                 hover:bg-electric/90 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBulkProposing ? 'Proposing...' : 'Propose All'}
                    </button>
                  )}
                  <button
                    onClick={fetchInboxItems}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Refresh
                  </button>
                </div>
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
                      onPropose={handleProposeAction}
                      onConfirm={handleConfirmAction}
                      onDismissProposal={handleDismissProposal}
                      isDeleting={deletingItemId === item.id}
                      isProposing={proposingItemId === item.id}
                      isConfirming={confirmingItemId === item.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lists Tab */}
          {activeTab === 'lists' && (
            <div className="space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-3xl font-display font-bold text-white mb-2">All Lists</h2>
                <p className="text-slate-400">Manage and organize your lists</p>
              </div>

              {isLoadingLists && (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="w-12 h-12 border-4 border-electric border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-300">Loading lists...</p>
                </div>
              )}

              {!isLoadingLists && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lists.map(list => (
                      <Link
                        key={list.id}
                        href={`/dashboard/lists/${list.id}`}
                        className="glass-card p-6 hover:border-electric/50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl
                                       group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: list.color || '#6B7280' }}
                          >
                            {list.icon === 'inbox' && '📥'}
                            {list.icon === 'cart' && '🛒'}
                            {list.icon === 'film' && '🎬'}
                            {list.icon === 'list' && '📝'}
                            {list.icon === 'folder' && '📁'}
                            {list.icon === 'star' && '⭐'}
                            {list.icon === 'heart' && '❤️'}
                            {list.icon === 'book' && '📚'}
                            {!list.icon && '📁'}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-lg group-hover:text-electric transition-colors">
                              {list.name}
                            </h3>
                            <p className="text-slate-400 text-sm">
                              {list.item_count} {list.item_count === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                          <svg
                            className="w-5 h-5 text-slate-400 group-hover:text-electric transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {lists.length === 0 && (
                    <div className="glass-card p-12 text-center">
                      <p className="text-slate-400 mb-4">No lists yet</p>
                      <Link
                        href="/dashboard/settings"
                        className="px-6 py-3 bg-electric text-midnight rounded-lg font-medium
                                   hover:bg-electric/90 transition-colors inline-block"
                      >
                        Create Your First List
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
