'use client'

import { useState } from 'react'

function isoToDisplay(iso: string) {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : ''
}

function displayToIso(display: string) {
  const [d, m, y] = display.split('/')
  if (d && m && y && y.length === 4) return `${y}-${m}-${d}`
  return null
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
    const expectedDisplay = isoToDisplay(value)
    // Solo sincronizar si el valor externo cambió programáticamente (no por el usuario escribiendo)
    return (
      <input
        className={className}
        type="text"
        placeholder={placeholder}
        pattern="\d{2}/\d{2}/\d{4}"
        value={display}
        disabled={disabled}
        required={required}
        onChange={(e) => {
          const raw = e.target.value
          setDisplay(raw)
          const iso = displayToIso(raw)
          if (iso) onChange(iso)
        }}
      />
    )
  }

  // Uncontrolled: show text input + hidden ISO input for form submission
  const { name } = rest as UncontrolledProps
  return (
    <>
      <input
        className={className}
        type="text"
        placeholder={placeholder}
        pattern="\d{2}/\d{2}/\d{4}"
        value={display}
        disabled={disabled}
        required={required}
        onChange={(e) => {
          const raw = e.target.value
          setDisplay(raw)
          const iso = displayToIso(raw)
          if (iso) setIsoValue(iso)
        }}
      />
      <input type="hidden" name={name} value={isoValue} />
    </>
  )
}
