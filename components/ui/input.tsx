type InputProps = {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  disabled?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date'
  className?: string
  id?: string
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  type = 'text',
  className = '',
  id,
}: InputProps) {
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label ? (
        <label className="text-sm font-medium" htmlFor={inputId} style={{ color: '#0B1F3A' }}>
          {label}
        </label>
      ) : null}
      <input
        className="h-9 w-full rounded-lg px-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={inputId}
        placeholder={placeholder}
        style={{
          background: '#F5F7FA',
          border: error ? '1.5px solid #dc2626' : '1.5px solid #e6eefc',
          color: '#0B1F3A',
        }}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.border = '1.5px solid #e6eefc'
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = `1.5px solid ${error ? '#dc2626' : '#1769E0'}`
          e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? 'rgba(220,38,38,0.12)' : 'rgba(23,105,224,0.12)'}`
        }}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
