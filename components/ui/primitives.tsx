'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

const accentConfig: Record<string, { border: string; iconBg: string; iconColor: string }> = {
  default: { border: '#e6eefc', iconBg: 'rgba(23,105,224,0.08)', iconColor: '#1769E0' },
  green:   { border: '#20E0B2', iconBg: 'rgba(32,224,178,0.12)', iconColor: '#20E0B2' },
  amber:   { border: '#f59e0b', iconBg: 'rgba(245,158,11,0.10)', iconColor: '#f59e0b' },
  red:     { border: '#ef4444', iconBg: 'rgba(239,68,68,0.10)',  iconColor: '#ef4444' },
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'default',
}: {
  label: string
  value: string | number
  icon?: LucideIcon
  accent?: 'default' | 'green' | 'amber' | 'red'
}) {
  const cfg = accentConfig[accent]
  return (
    <div
      className="relative rounded-xl p-5"
      style={{
        background: '#ffffff',
        border: `1px solid ${cfg.border}`,
        boxShadow: '0 1px 4px rgba(23,105,224,0.06)',
      }}
    >
      {Icon ? (
        <div
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: cfg.iconBg }}
        >
          <Icon size={18} style={{ color: cfg.iconColor }} />
        </div>
      ) : null}
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: '#8ba3c7' }}
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold" style={{ color: '#0B1F3A' }}>
        {value}
      </p>
    </div>
  )
}

export function TableTh({ children, align }: { children: ReactNode; align?: 'right' | 'left' }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide ${align === 'right' ? 'text-right' : ''}`}
      style={{ color: '#8ba3c7', background: '#F5F7FA' }}
    >
      {children}
    </th>
  )
}

export function TableTd({ children, colSpan, align }: { children: ReactNode; colSpan?: number; align?: 'right' }) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-sm ${align === 'right' ? 'text-right' : ''}`}
      style={{ color: '#5a6a82' }}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

export function FilterTextInput({
  label,
  name,
  value,
  placeholder,
}: {
  label: string
  name: string
  value: string
  placeholder?: string
}) {
  return (
    <label className="block space-y-1 text-sm font-medium" style={{ color: '#0B1F3A' }}>
      {label}
      <input
        className="mt-1 h-10 w-full rounded-lg px-3 text-sm outline-none transition-all"
        style={{
          background: '#F5F7FA',
          border: '1.5px solid #e6eefc',
          color: '#0B1F3A',
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = '1.5px solid #1769E0'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(23,105,224,0.12)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = '1.5px solid #e6eefc'
          e.currentTarget.style.boxShadow = 'none'
        }}
        defaultValue={value}
        name={name}
        placeholder={placeholder}
      />
    </label>
  )
}
