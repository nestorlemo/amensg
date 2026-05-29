import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

const accentClasses: Record<string, string> = {
  default: 'border-slate-200',
  green: 'border-l-4 border-l-emerald-500 border-slate-200',
  amber: 'border-l-4 border-l-amber-400 border-slate-200',
  red: 'border-l-4 border-l-red-400 border-slate-200',
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
  return (
    <div className={`relative rounded-lg border bg-white p-5 shadow-sm ${accentClasses[accent]}`}>
      {Icon ? <Icon size={20} className="absolute right-4 top-4 text-slate-300" /> : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  )
}

export function TableTh({ children, align }: { children: ReactNode; align?: 'right' | 'left' }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </th>
  )
}

export function TableTd({ children, colSpan, align }: { children: ReactNode; colSpan?: number; align?: 'right' }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-slate-700 ${align === 'right' ? 'text-right' : ''}`} colSpan={colSpan}>
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
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
      />
    </label>
  )
}
