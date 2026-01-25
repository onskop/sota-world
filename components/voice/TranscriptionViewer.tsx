'use client'

import { useState, useEffect } from 'react'

interface TranscriptionViewerProps {
  transcription: string
  onEdit?: (newText: string) => void
  onChange?: (newText: string) => void
  editable?: boolean
}

export function TranscriptionViewer({
  transcription,
  onEdit,
  onChange,
  editable = true,
}: TranscriptionViewerProps) {
  const [isEditing, setIsEditing] = useState(transcription === '')
  const [editedText, setEditedText] = useState(transcription)

  useEffect(() => {
    setEditedText(transcription)
    setIsEditing(transcription === '')
  }, [transcription])

  const handleSave = () => {
    if (onEdit) {
      onEdit(editedText)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedText(transcription)
    setIsEditing(false)
  }

  return (
    <div className="space-y-3">
      {!isEditing ? (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-slate-100 whitespace-pre-wrap">{transcription || 'No content'}</p>
        </div>
      ) : (
        <textarea
          value={editedText}
          onChange={(e) => {
            const newValue = e.target.value
            setEditedText(newValue)
            if (onChange) {
              onChange(newValue)
            }
          }}
          className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-electric min-h-[120px]"
          placeholder={transcription === '' ? "Type your note here..." : "Edit transcription..."}
          autoFocus={transcription === ''}
        />
      )}

      {editable && (
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors text-sm"
            >
              Edit Transcription
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-electric text-midnight rounded-lg hover:bg-electric/90 transition-colors text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors text-sm"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
