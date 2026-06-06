'use client'

import { useState } from 'react'

function isoMonthToDisplay(iso: string) {
  const [y, m] = iso.split('-')
  return m && y ? `${m}/${y}` : ''
}

function displayToIsoMonth(display: string) {
  const parts = display.split('/')
  if (parts.length !== 2) return null
  const [m, y] = parts
  if (!m || !y || y.length !== 4 || m.length !== 2) return null
  return `${y}-${m}`
}

type Props = {
  value: string  // 'YYYY-MM'
  onChange: (isoMonth: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MonthInput({ value, onChange, placeholder = 'mm/yyyy', className, disabled }: Props) {
  const [display, setDisplay] = useState(isoMonthToDisplay(value))

  const expectedDisplay = isoMonthToDisplay(value)
  if (display !== expectedDisplay && !display.includes('/')) {
    setDisplay(expectedDisplay)
  }

  return (
    <input
      type="text"
      value={display}
      placeholder={placeholder}
      pattern="\d{2}/\d{4}"
      disabled={disabled}
      className={className}
      onChange={(e) => {
        const raw = e.target.value
        setDisplay(raw)
        const iso = displayToIsoMonth(raw)
        if (iso) onChange(iso)
      }}
    />
  )
}
