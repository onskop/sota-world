'use client'

import { ReactNode } from 'react'

interface WorkflowStepProps {
  children: ReactNode
  isActive: boolean
  isCompleted: boolean
  isPending: boolean
  step: number
  title: string
}

export function WorkflowStep({
  children,
  isActive,
  isCompleted,
  isPending,
  step,
  title,
}: WorkflowStepProps) {
  if (isPending) {
    return null
  }

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out
        ${isActive ? 'py-8' : 'py-4'}
      `}
    >
      <div
        className={`
          glass-card p-6 md:p-8
          transition-all duration-300
          ${isActive ? 'border-electric/30' : 'border-slate-700/50'}
          ${isCompleted ? 'opacity-70' : 'opacity-100'}
        `}
      >
        {/* Step header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`
              flex items-center justify-center
              rounded-lg font-bold
              transition-all duration-300
              ${isActive ? 'w-10 h-10 text-lg bg-electric text-midnight' : 'w-8 h-8 text-sm bg-slate-700 text-slate-300'}
              ${isCompleted ? 'bg-green-500 text-white' : ''}
            `}
          >
            {isCompleted ? '✓' : step}
          </div>
          <h2
            className={`
              font-display font-bold
              transition-all duration-300
              ${isActive ? 'text-xl md:text-2xl text-white' : 'text-lg text-slate-400'}
            `}
          >
            {title}
          </h2>
        </div>

        {/* Step content */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
