import { type ReactNode } from 'react'

import { formatMoney, isFiniteMoney } from '@/lib/liquidaciones-format'

export function Metric({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  const renderedValue = typeof value === 'number' ? String(value) : formatMoney(value)
  const isNumericValue = typeof value === 'number' || isFiniteMoney(value)

  return (
    <div className="flex h-full min-h-28 flex-col justify-between rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase leading-4 text-slate-500">{label}</p>
      <p
        className={`mt-2 font-semibold leading-tight text-slate-950 ${
          isNumericValue ? 'text-xl tabular-nums' : 'text-lg'
        }`}
      >
        {renderedValue}{suffix}
      </p>
    </div>
  )
}

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  )
}

export function FinancialRow({
  concept,
  withoutIva,
  iva,
  total,
  emphasis = false,
}: {
  concept: string
  withoutIva: string
  iva: string
  total: string
  emphasis?: boolean
}) {
  return (
    <tr className={`border-t border-slate-200 ${emphasis ? 'bg-slate-50 font-semibold text-slate-950' : ''}`}>
      <Td>{concept}</Td>
      <Td align="right">{formatMoney(withoutIva)}</Td>
      <Td align="right">{formatMoney(iva)}</Td>
      <Td align="right">{formatMoney(total)}</Td>
    </tr>
  )
}

export function FilterInput({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={value} name={name} />
    </label>
  )
}

export function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>
}

export function Td({ children, colSpan, align = 'left' }: { children: ReactNode; colSpan?: number; align?: 'left' | 'right' }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-slate-700 ${align === 'right' ? 'text-right tabular-nums' : ''}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  )
}
