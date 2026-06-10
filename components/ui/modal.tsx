'use client'

import type { ReactNode } from 'react'

export function ModalShell({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl md:max-h-[85vh] md:rounded-2xl ${maxWidth}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-slate-200"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer ? (
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
