type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

type BadgeProps = {
  label: string
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
  warning: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' },
  danger:  { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' },
  info:    { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' },
  neutral: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
}

export function Badge({ label, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={variantStyles[variant]}
    >
      {label}
    </span>
  )
}
