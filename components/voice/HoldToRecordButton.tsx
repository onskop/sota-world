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
        onRecordingComplete(audioBlob, recordingDuration)

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        setMode('idle')
        setDuration(0)
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
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30)
      }
    }
  }, [isRecording])

  const handlePointerDown = useCallback(() => {
    if (!isActive) return

    pointerDownTimeRef.current = Date.now()
    setMode('hold-recording')
    startRecording()
  }, [isActive, startRecording])

  const handlePointerUp = useCallback(() => {
    if (!isActive) return

    const pressDuration = Date.now() - pointerDownTimeRef.current

    // If press was < 300ms and we're in hold-recording mode, switch to tap-recording
    if (pressDuration < 300 && mode === 'hold-recording') {
      setMode('tap-recording')
      return // Keep recording
    }

    // If we're in tap-recording mode, this is a second tap to stop
    if (mode === 'tap-recording') {
      stopRecording()
      return
    }

    // Otherwise, stop recording (hold release)
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

  const buttonSize = isActive
    ? 'w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32'
    : 'w-16 h-16'

  const iconSize = isActive ? 'w-12 h-12' : 'w-8 h-8'

  return (
    <div className="flex flex-col items-center gap-4">
      {error && isActive && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm max-w-md text-center">
          {error}
        </div>
      )}

      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        disabled={!isActive && !isCompleted}
        className={`
          ${buttonSize}
          rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${isActive ? 'bg-electric hover:bg-electric/90 active:bg-electric/80' : 'bg-electric/50'}
          ${isRecording ? 'ring-4 ring-red-500/50 animate-pulse' : ''}
          ${isCompleted ? 'cursor-pointer hover:scale-105' : ''}
          disabled:opacity-30 disabled:cursor-not-allowed
          touch-none select-none
        `}
        aria-label={isRecording ? 'Recording... Release to stop' : 'Hold to record'}
      >
        {isRecording ? (
          <div className={`${iconSize} bg-red-500 rounded-full`} />
        ) : (
          <svg
            className={`${iconSize} text-midnight`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {isRecording && isActive && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-white font-mono text-2xl md:text-3xl font-bold">
            {formatDuration(duration)}
          </span>
          <p className="text-slate-300 text-sm md:text-base text-center max-w-xs">
            {mode === 'hold-recording' ? 'Release to stop' : 'Tap again to stop'}
          </p>
        </div>
      )}

      {!isRecording && isActive && (
        <p className="text-slate-300 text-sm md:text-base text-center max-w-xs">
          Hold to record or tap to start/stop
        </p>
      )}
    </div>
  )
}
