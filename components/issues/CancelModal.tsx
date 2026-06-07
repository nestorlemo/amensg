'use client'

import { useState } from 'react'

export function CancelModal({
  issueId,
  descripcion,
  onConfirm,
  onClose,
}: {
  issueId: string
  descripcion: string
  onConfirm: (id: string, motivo: string) => Promise<void>
  onClose: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) { setError('El motivo es requerido.'); return }
    setSaving(true)
    try {
      await onConfirm(issueId, motivo.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-md md:rounded-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Cancelar issue</h2>
          <button className="rounded-md p-1 text-slate-400 hover:bg-slate-200" onClick={onClose} type="button">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <form className="space-y-4 px-6 py-5" onSubmit={(e) => void handleSubmit(e)}>
          <p className="text-sm text-slate-600">
            Issue: <span className="font-medium text-slate-900">{descripcion.length > 80 ? `${descripcion.slice(0, 80)}…` : descripcion}</span>
          </p>
          <label className="block text-sm font-medium text-slate-700">
            Motivo de cancelación <span className="text-red-500">*</span>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setError(null) }}
              autoFocus
              required
            />
          </label>
          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              className="h-9 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Volver
            </button>
            <button
              className="h-9 rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Cancelando…' : 'Confirmar cancelación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
