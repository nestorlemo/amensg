'use client'

import type { ReactNode } from 'react'

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-gray-50">
      <tr>{children}</tr>
    </thead>
  )
}

export function TableTh({
  children,
  align,
}: {
  children: ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  const alignClass =
    align === 'right'  ? 'text-right'  :
    align === 'center' ? 'text-center' :
    'text-left'
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${alignClass}`}
    >
      {children}
    </th>
  )
}

export function TableTd({
  children,
  colSpan,
  align,
}: {
  children: ReactNode
  colSpan?: number
  align?: 'left' | 'right' | 'center'
}) {
  const alignClass =
    align === 'right'  ? 'text-right'  :
    align === 'center' ? 'text-center' :
    ''
  return (
    <td
      className={`whitespace-nowrap border-b border-gray-100 px-4 py-3 text-sm text-gray-700 ${alignClass}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}
