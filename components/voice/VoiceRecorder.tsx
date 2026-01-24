'use client'

import { useState, useRef } from 'react'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const recordingDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        onRecordingComplete(audioBlob, recordingDuration)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Update duration counter
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to access microphone. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setDuration(0)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-electric text-midnight font-medium rounded-lg hover:bg-electric/90 transition-colors"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-sunrise text-white font-medium rounded-lg hover:bg-sunrise/90 transition-colors"
          >
            Stop Recording
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-slate-300 font-mono text-lg">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {isRecording && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-slate-300 text-sm">
            Recording in progress... Speak clearly into your microphone.
          </p>
        </div>
      )}
    </div>
  )
}
