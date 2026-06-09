type SelectOption = {
  value: string
  label: string
}

type SelectProps = {
  label?: string
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
}

export function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  className = '',
  id,
}: SelectProps) {
  const selectId = id ?? (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label ? (
        <label className="text-sm font-medium" htmlFor={selectId} style={{ color: '#0B1F3A' }}>
          {label}
        </label>
      ) : null}
      <select
        className="h-9 w-full rounded-lg px-3 text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={selectId}
        style={{
          background: '#F5F7FA',
          border: '1.5px solid #e6eefc',
          color: value ? '#0B1F3A' : '#8ba3c7',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6a82' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: '30px',
        }}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={(e) => {
          e.currentTarget.style.border = '1.5px solid #e6eefc'
          e.currentTarget.style.boxShadow = 'none'
        }}
        onFocus={(e) => {
          e.currentTarget.style.border = '1.5px solid #1769E0'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(23,105,224,0.12)'
        }}
      >
        {placeholder ? (
          <option disabled value="">
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
