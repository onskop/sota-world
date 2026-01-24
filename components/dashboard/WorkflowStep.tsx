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
        flex flex-col items-center justify-center
        transition-all duration-300 ease-in-out
        ${isActive ? 'min-h-screen py-8' : 'min-h-[120px] py-4'}
        ${isCompleted ? 'opacity-60' : 'opacity-100'}
      `}
    >
      {/* Step indicator */}
      <div
        className={`
          flex items-center gap-3 mb-6
          transition-all duration-300
          ${isActive ? 'scale-100' : 'scale-75'}
        `}
      >
        <div
          className={`
            flex items-center justify-center
            rounded-full font-bold
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
            ${isActive ? 'text-2xl md:text-3xl text-white' : 'text-lg text-slate-400'}
          `}
        >
          {title}
        </h2>
      </div>

      {/* Step content */}
      <div
        className={`
          w-full max-w-2xl px-4
          transition-all duration-300
          ${isActive ? 'scale-100' : 'scale-90'}
        `}
      >
        {children}
      </div>
    </div>
  )
}
