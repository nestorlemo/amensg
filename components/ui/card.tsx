import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  description?: string
  children?: ReactNode
  className?: string
}

export function Card({ title, description, children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{
        background: '#fff',
        border: '1px solid #e6eefc',
        boxShadow: '0 1px 4px rgba(11,31,58,0.06)',
      }}
    >
      {(title || description) ? (
        <div className="mb-4">
          {title ? (
            <h3 className="text-sm font-semibold" style={{ color: '#0B1F3A' }}>
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs" style={{ color: '#5a6a82' }}>
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
