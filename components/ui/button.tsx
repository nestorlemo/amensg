'use client'
import type { ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md'

const BASE = 'inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 rounded-md'

const VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-slate-950 text-white hover:bg-slate-800',
  outline:   'border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
  danger:    'border border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50',
  ghost:     'text-slate-600 hover:bg-slate-100',
}

const SIZE: Record<ButtonSize, string> = {
  md: 'h-9 px-4 text-sm',
  sm: 'h-7 px-3 text-xs',
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  onClick,
  type = 'button',
  className = '',
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}
