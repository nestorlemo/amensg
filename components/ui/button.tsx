import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  className?: string
}

const variantStyles: Record<ButtonVariant, { style: React.CSSProperties; className: string }> = {
  primary: {
    style: { background: '#1769E0', color: '#fff', border: '1.5px solid #1769E0' },
    className: 'hover:opacity-90 active:opacity-80',
  },
  secondary: {
    style: { background: '#fff', color: '#1769E0', border: '1.5px solid #1769E0' },
    className: 'hover:bg-blue-50 active:bg-blue-100',
  },
  danger: {
    style: { background: '#dc2626', color: '#fff', border: '1.5px solid #dc2626' },
    className: 'hover:opacity-90 active:opacity-80',
  },
  ghost: {
    style: { background: 'transparent', color: '#1769E0', border: '1.5px solid transparent' },
    className: 'hover:bg-blue-50 active:bg-blue-100',
  },
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      fill="none"
      height="14"
      viewBox="0 0 14 14"
      width="14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="opacity-25" cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
      <path
        className="opacity-75"
        d="M7 2a5 5 0 0 1 5 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className = '',
}: ButtonProps) {
  const { style, className: variantClass } = variantStyles[variant]

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      type={type}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}
