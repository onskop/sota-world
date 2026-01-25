'use client'

import { useState, useRef, useCallback } from 'react'

interface HoldToRecordButtonProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void
  isActive: boolean
  isCompleted: boolean
  onTap?: () => void
}

type RecordingMode = 'idle' | 'hold-recording' | 'tap-recording'

export function HoldToRecordButton({
  onRecordingComplete,
  isActive,
  isCompleted,
  onTap,
}: HoldToRecordButtonProps) {
  const [mode, setMode] = useState<RecordingMode>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pointerDownTimeRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const isRecording = mode === 'hold-recording' || mode === 'tap-recording'

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

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

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        setMode('idle')
        setDuration(0)

        // Call callback after state cleanup
        onRecordingComplete(audioBlob, recordingDuration)
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      startTimeRef.current = Date.now()

      // Update duration counter
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)

      // Haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Microphone access denied. Please allow microphone access in settings.')
      setMode('idle')
    }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30)
      }
    }
  }, [])

  const handlePointerDown = useCallback(() => {
    if (!isActive) return

    // If already in tap-recording mode, don't start new recording
    // Just mark this as a tap to stop (handled in pointerUp)
    if (mode === 'tap-recording') {
      pointerDownTimeRef.current = Date.now()
      return
    }

    // Start new recording
    pointerDownTimeRef.current = Date.now()
    setMode('hold-recording')
    startRecording()
  }, [isActive, mode, startRecording])

  const handlePointerUp = useCallback(() => {
    if (!isActive) return

    const pressDuration = Date.now() - pointerDownTimeRef.current

    // If we're in tap-recording mode, stop recording
    if (mode === 'tap-recording') {
      stopRecording()
      return
    }

    // If press was < 300ms and we're in hold-recording mode, switch to tap-recording
    if (pressDuration < 300 && mode === 'hold-recording') {
      setMode('tap-recording')
      return // Keep recording
    }

    // Otherwise, stop recording (hold release after > 300ms)
    if (mode === 'hold-recording') {
      stopRecording()
    }
  }, [isActive, mode, stopRecording])

  const handlePointerCancel = useCallback(() => {
    if (mode === 'hold-recording') {
      stopRecording()
    }
  }, [mode, stopRecording])

  const handleClick = useCallback(() => {
    if (isCompleted && onTap) {
      onTap()
    }
  }, [isCompleted, onTap])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Render completed (small) button
  if (isCompleted && !isActive) {
    return (
      <div className="flex items-center gap-4">
        <button
          onClick={handleClick}
          className="px-4 py-2 bg-slate-700 text-slate-300 font-medium rounded-lg
                     hover:bg-slate-600 transition-colors text-sm"
        >
          Re-record
        </button>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
          <span>Recording complete</span>
        </div>
      </div>
    )
  }

  // Render active (large) button
  return (
    <div className="flex flex-col items-center gap-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm max-w-md text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        {!isRecording ? (
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="px-12 py-6 md:px-16 md:py-8 bg-electric text-midnight font-medium rounded-lg
                       hover:bg-electric/90 active:bg-electric/80 transition-colors
                       text-xl md:text-2xl font-display touch-none select-none flex items-center gap-3"
          >
            <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Hold to Record
          </button>
        ) : (
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="px-12 py-6 md:px-16 md:py-8 bg-sunrise text-white font-medium rounded-lg
                       hover:bg-sunrise/90 active:bg-sunrise/80 transition-colors
                       text-xl md:text-2xl font-display touch-none select-none flex items-center gap-3"
          >
            <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {mode === 'tap-recording' ? 'Tap to Stop' : 'Release to Stop'}
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-slate-300 font-mono text-2xl md:text-3xl">
              {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      {isRecording && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg max-w-md">
          <p className="text-slate-300 text-sm md:text-base text-center">
            Recording in progress... Speak clearly into your microphone.
          </p>
        </div>
      )}

      {!isRecording && (
        <p className="text-slate-400 text-sm text-center">
          Hold button to record, or tap once to start and tap again to stop
        </p>
      )}
    </div>
  )
}
