'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 flex w-full max-w-lg flex-col rounded-xl shadow-2xl"
        style={{ background: '#fff', border: '1px solid #e6eefc' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between rounded-t-xl px-5 py-4"
          style={{ background: 'var(--gradient-header)' }}
        >
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            type="button"
            onClick={onClose}
          >
            <svg fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div
            className="flex items-center justify-end gap-2 rounded-b-xl border-t px-5 py-3"
            style={{ borderColor: '#e6eefc', background: '#F5F7FA' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
