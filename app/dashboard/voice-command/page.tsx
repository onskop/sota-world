'use client'

import { useState } from 'react'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { TranscriptionViewer } from '@/components/voice/TranscriptionViewer'

export default function VoiceCommandPage() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [transcription, setTranscription] = useState<string | null>(null)
  const [voiceRecordingId, setVoiceRecordingId] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRecordingComplete = (blob: Blob, recordingDuration: number) => {
    setAudioBlob(blob)
    setDuration(recordingDuration)
    setTranscription(null)
    setError(null)
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return

    setIsTranscribing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Transcription failed')
      }

      setTranscription(data.recording.transcription)
      setVoiceRecordingId(data.recording.id)
    } catch (err) {
      console.error('Transcription error:', err)
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleEditTranscription = (newText: string) => {
    setTranscription(newText)
  }

  const handleExecuteAgent = async () => {
    if (!transcription) return

    setIsExecuting(true)
    setError(null)
    setExecutionResult(null)

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription,
          voice_recording_id: voiceRecordingId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Agent execution failed')
      }

      setExecutionResult(data)
    } catch (err) {
      console.error('Agent execution error:', err)
      setError(err instanceof Error ? err.message : 'Failed to execute agent')
    } finally {
      setIsExecuting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Voice Command
        </h1>
        <p className="text-slate-400">
          Record a voice command, review the transcription, and execute actions
        </p>
      </div>

      {/* Step 1: Record */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-electric text-midnight rounded-full font-bold">
            1
          </div>
          <h2 className="text-xl font-semibold text-white">Record Your Command</h2>
        </div>

        <VoiceRecorder onRecordingComplete={handleRecordingComplete} />

        {audioBlob && (
          <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-300">
                  Recording complete: {duration}s
                </p>
                <p className="text-xs text-slate-400">
                  Size: {formatFileSize(audioBlob.size)}
                </p>
              </div>
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="px-4 py-2 bg-electric text-midnight font-medium rounded-lg hover:bg-electric/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTranscribing ? 'Transcribing...' : 'Transcribe'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Review Transcription */}
      {transcription && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-electric text-midnight rounded-full font-bold">
              2
            </div>
            <h2 className="text-xl font-semibold text-white">Review Transcription</h2>
          </div>

          <TranscriptionViewer
            transcription={transcription}
            onEdit={handleEditTranscription}
            editable
          />
        </div>
      )}

      {/* Step 3: Execute Command */}
      {transcription && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-electric text-midnight rounded-full font-bold">
              3
            </div>
            <h2 className="text-xl font-semibold text-white">Execute Command</h2>
          </div>

          {!executionResult ? (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">
                Let the AI agent process your transcription and save it as a note
              </p>
              <button
                onClick={handleExecuteAgent}
                disabled={isExecuting}
                className="px-6 py-3 bg-electric text-midnight font-semibold rounded-lg hover:bg-electric/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? 'Executing Agent...' : 'Save as Note'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-400">
                      {executionResult.result?.success ? 'Command Executed Successfully' : 'Execution Complete'}
                    </p>
                    <p className="text-sm text-green-300/80 mt-1">
                      {executionResult.result?.message || executionResult.message || 'Action completed'}
                    </p>
                    <div className="mt-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">Action</p>
                      <p className="text-slate-200 font-medium capitalize">{executionResult.action?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400 mt-2 mb-1">Transcription</p>
                      <p className="text-slate-300 text-sm">{transcription}</p>
                      {executionResult.result && (
                        <>
                          {executionResult.result.list_name && (
                            <>
                              <p className="text-xs text-slate-400 mt-2 mb-1">List</p>
                              <p className="text-slate-300 text-sm">{executionResult.result.list_name}</p>
                            </>
                          )}
                          {executionResult.result.items_added && (
                            <>
                              <p className="text-xs text-slate-400 mt-2 mb-1">Items Added</p>
                              <p className="text-slate-300 text-sm">{executionResult.result.items_added}</p>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Tool calls: {executionResult.execution?.toolCalls || 0} | Finish reason: {executionResult.execution?.finishReason || 'unknown'}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setAudioBlob(null)
                  setTranscription(null)
                  setVoiceRecordingId(null)
                  setExecutionResult(null)
                  setError(null)
                }}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors text-sm"
              >
                Record New Command
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}
