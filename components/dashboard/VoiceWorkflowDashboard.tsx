'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkflowStep } from './WorkflowStep'
import { HoldToRecordButton } from '../voice/HoldToRecordButton'
import type { User } from '@supabase/supabase-js'

interface VoiceWorkflowDashboardProps {
  user: User
}

type WorkflowState =
  | 'INITIAL'
  | 'RECORDING'
  | 'RECORDED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'SAVING'
  | 'SAVED'

export function VoiceWorkflowDashboard({ user }: VoiceWorkflowDashboardProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState>('INITIAL')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [transcription, setTranscription] = useState('')
  const [editedTranscription, setEditedTranscription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRecordingComplete = useCallback((blob: Blob, dur: number) => {
    setAudioBlob(blob)
    setDuration(dur)
    setWorkflowState('RECORDED')
    setError(null)
  }, [])

  const handleTranscribe = useCallback(async () => {
    if (!audioBlob) return

    setWorkflowState('TRANSCRIBING')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      setTranscription(data.recording.transcription_text)
      setEditedTranscription(data.recording.transcription_text)
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

  const handleSave = async () => {
    setWorkflowState('SAVING')
    setError(null)

    try {
      const textToSave = isEditing ? editedTranscription : transcription

      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: textToSave,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      const data = await response.json()
      setExecutionResult(data)
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
    setDuration(0)
    setTranscription('')
    setEditedTranscription('')
    setIsEditing(false)
    setExecutionResult(null)
    setError(null)
  }

  const handleRecordingStepTap = () => {
    // Tapping completed recording step resets workflow
    if (workflowState !== 'INITIAL' && workflowState !== 'RECORDING') {
      handleReset()
    }
  }

  const handleTranscriptionStepTap = () => {
    // Tapping completed transcription allows editing
    if (workflowState === 'TRANSCRIBED' || workflowState === 'SAVING' || workflowState === 'SAVED') {
      setIsEditing(true)
    }
  }

  const isRecordStepActive = workflowState === 'INITIAL' || workflowState === 'RECORDING'
  const isRecordStepCompleted =
    workflowState !== 'INITIAL' && workflowState !== 'RECORDING'
  const isRecordStepPending = false

  const isTranscribeStepActive =
    workflowState === 'RECORDED' ||
    workflowState === 'TRANSCRIBING'
  const isTranscribeStepCompleted =
    workflowState === 'TRANSCRIBED' ||
    workflowState === 'SAVING' ||
    workflowState === 'SAVED'
  const isTranscribeStepPending = workflowState === 'INITIAL' || workflowState === 'RECORDING'

  const isSaveStepActive =
    workflowState === 'TRANSCRIBED' ||
    workflowState === 'SAVING' ||
    workflowState === 'SAVED'
  const isSaveStepCompleted = false
  const isSaveStepPending =
    workflowState === 'INITIAL' ||
    workflowState === 'RECORDING' ||
    workflowState === 'RECORDED' ||
    workflowState === 'TRANSCRIBING'

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

      {/* Main workflow container */}
      <div className="pt-16 pb-8">
        <div className="max-w-4xl mx-auto">
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

            {(workflowState === 'TRANSCRIBED' ||
              workflowState === 'SAVING' ||
              workflowState === 'SAVED') && (
              <div
                className="glass-card p-6 cursor-pointer hover:border-electric/50 transition-colors"
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
            title="Save"
            isActive={isSaveStepActive}
            isCompleted={isSaveStepCompleted}
            isPending={isSaveStepPending}
          >
            {workflowState === 'TRANSCRIBED' && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleSave}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-electric text-midnight hover:bg-electric/90 transition-all flex items-center justify-center font-display font-bold text-xl md:text-2xl"
                >
                  Save
                </button>
              </div>
            )}

            {workflowState === 'SAVING' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-electric border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-300 text-lg">Saving note...</p>
              </div>
            )}

            {workflowState === 'SAVED' && executionResult && (
              <div className="space-y-6">
                <div className="glass-card p-6 border-green-500/30">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-xl mb-2">Success!</h3>
                      <p className="text-slate-300">
                        {executionResult.message || 'Note saved successfully'}
                      </p>
                    </div>
                  </div>

                  {executionResult.action && (
                    <div className="mt-4 p-4 bg-midnight/50 rounded-lg">
                      <p className="text-slate-400 text-sm">
                        <span className="font-semibold">Action:</span>{' '}
                        {executionResult.action}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleReset}
                  className="w-full py-4 bg-electric text-midnight rounded-lg font-medium text-lg hover:bg-electric/90 transition-colors"
                >
                  Record New Note
                </button>
              </div>
            )}
          </WorkflowStep>

          {/* Error display */}
          {error && (
            <div className="fixed bottom-8 left-4 right-4 max-w-md mx-auto">
              <div className="glass-card p-4 border-red-500/30 bg-red-500/10">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-red-500 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-400">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
