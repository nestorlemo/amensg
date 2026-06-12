'use client'

import { useRef, useState } from 'react'

function isoToDisplay(iso: string) {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : ''
}

function displayToIso(display: string): string | null {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return null
  const d = digits.slice(0, 2)
  const m = digits.slice(2, 4)
  const y = digits.slice(4, 8)
  const dn = parseInt(d, 10)
  const mn = parseInt(m, 10)
  if (dn < 1 || dn > 31 || mn < 1 || mn > 12) return null
  return `${y}-${m}-${d}`
}

// Formats up to 8 digits as dd/mm/yyyy
function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

type ControlledProps = {
  value: string
  onChange: (isoValue: string) => void
  defaultValue?: never
  name?: never
  className?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

type UncontrolledProps = {
  defaultValue?: string
  name: string
  value?: never
  onChange?: never
  className?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

type Props = ControlledProps | UncontrolledProps

export function DateInput({ className, placeholder = 'dd/mm/yyyy', required, disabled, ...rest }: Props) {
  const isControlled = 'value' in rest && rest.value !== undefined
  const focused = useRef(false)

  const [display, setDisplay] = useState(() =>
    isControlled
      ? isoToDisplay((rest as ControlledProps).value)
      : isoToDisplay((rest as UncontrolledProps).defaultValue ?? '')
  )
  const [isoValue, setIsoValue] = useState(() =>
    isControlled
      ? (rest as ControlledProps).value
      : (rest as UncontrolledProps).defaultValue ?? ''
  )

  if (isControlled) {
    const { value, onChange } = rest as ControlledProps
    const expected = isoToDisplay(value)
    // Sync with external value when not focused
    if (!focused.current && display !== expected) {
      setDisplay(expected)
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const masked = applyMask(e.target.value)
      setDisplay(masked)
      const iso = displayToIso(masked)
      if (iso) onChange(iso)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'Backspace') {
        // Remove auto-inserted slashes when backspacing into them
        if (display.endsWith('/')) {
          e.preventDefault()
          setDisplay(display.slice(0, -1))
        }
      }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
      e.preventDefault()
      const masked = applyMask(e.clipboardData.getData('text'))
      setDisplay(masked)
      const iso = displayToIso(masked)
      if (iso) onChange(iso)
    }

    return (
      <input
        className={className}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={display}
        disabled={disabled}
        required={required}
        onFocus={() => { focused.current = true }}
        onBlur={() => { focused.current = false }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    )
  }

  // Uncontrolled: text input + hidden ISO input for form submission
  const { name } = rest as UncontrolledProps

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value)
    setDisplay(masked)
    const iso = displayToIso(masked)
    if (iso) setIsoValue(iso)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && display.endsWith('/')) {
      e.preventDefault()
      setDisplay(display.slice(0, -1))
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const masked = applyMask(e.clipboardData.getData('text'))
    setDisplay(masked)
    const iso = displayToIso(masked)
    if (iso) setIsoValue(iso)
  }

  return (
    <>
      <input
        className={className}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={display}
        disabled={disabled}
        required={required}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <input type="hidden" name={name} value={isoValue} />
    </>
  )
}
