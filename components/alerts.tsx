import type { ReactNode } from 'react'

type AlertProps = {
  children: ReactNode
  className?: string
}

const tones = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
}

function Alert({ children, className = '', tone }: AlertProps & { tone: keyof typeof tones }) {
  return <div className={`rounded-md border p-3 text-sm ${tones[tone]} ${className}`}>{children}</div>
}

export function AlertError(props: AlertProps) {
  return <Alert tone="error" {...props} />
}

export function AlertSuccess(props: AlertProps) {
  return <Alert tone="success" {...props} />
}

export function AlertWarning(props: AlertProps) {
  return <Alert tone="warning" {...props} />
}

export function AlertInfo(props: AlertProps) {
  return <Alert tone="info" {...props} />
}
