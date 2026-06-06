'use client'

import { useState } from 'react'

import { DateInput } from '@/components/date-input'

type Props = {
  empresas: string   // comma-separated names
  periodo: string    // MM/YYYY
  onConfirm: (fecha: string) => Promise<void>
  onCancel: () => void
}

export function ConfirmarCobroModal({ empresas, periodo, onConfirm, onCancel }: Props) {
  const [fecha, setFecha] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!fecha) return
    setLoading(true)
    try {
      await onConfirm(fecha)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Marcar como cobrado</h2>
        <p className="mb-1 text-sm text-slate-700">
          <span className="font-medium">Empresa(s):</span> {empresas}
        </p>
        <p className="mb-5 text-sm text-slate-700">
          <span className="font-medium">Período:</span> {periodo}
        </p>
        <label className="mb-5 block text-xs font-medium text-slate-600">
          Fecha de cobro
          <DateInput
            value={fecha}
            onChange={setFecha}
            placeholder="dd/mm/yyyy"
            required
            className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={!fecha || loading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
