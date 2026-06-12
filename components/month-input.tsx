'use client'

import { useRef, useState } from 'react'

function isoMonthToDisplay(iso: string) {
  const [y, m] = iso.split('-')
  return m && y ? `${m}/${y}` : ''
}

function displayToIsoMonth(display: string): string | null {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 6) return null
  const m = digits.slice(0, 2)
  const y = digits.slice(2, 6)
  const mn = parseInt(m, 10)
  if (mn < 1 || mn > 12) return null
  return `${y}-${m}`
}

// Takes any string, extracts up to 6 digits and formats as mm/yyyy
function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

type Props = {
  value: string  // 'YYYY-MM'
  onChange: (isoMonth: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MonthInput({ value, onChange, placeholder = 'mm/yyyy', className, disabled }: Props) {
  const [display, setDisplay] = useState(() => isoMonthToDisplay(value))
  const focused = useRef(false)

  // Sync with external value when not focused
  const expected = isoMonthToDisplay(value)
  if (!focused.current && display !== expected) {
    setDisplay(expected)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value)
    setDisplay(masked)
    const iso = displayToIsoMonth(masked)
    if (iso) onChange(iso)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // When cursor is right after the slash, Backspace should remove the slash
    if (e.key === 'Backspace' && display.endsWith('/')) {
      e.preventDefault()
      setDisplay(display.slice(0, -1))
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const masked = applyMask(e.clipboardData.getData('text'))
    setDisplay(masked)
    const iso = displayToIsoMonth(masked)
    if (iso) onChange(iso)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onFocus={() => { focused.current = true }}
      onBlur={() => { focused.current = false }}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  )
}
