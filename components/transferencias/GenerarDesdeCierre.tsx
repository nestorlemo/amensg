'use client'

import { useState } from 'react'
import { fmt, MESES } from './types'

type SocioPreview = {
  socioId: string
  socioNombre: string
  montoPesos: string
  montoUsd: string | null
  cuentaPesos: string | null
  cuentaUsd: string | null
  yaExisteUYU: boolean
  yaExisteUSD: boolean
}

type Preview = {
  anio: number
  mes: number
  estado: string
  socios: SocioPreview[]
}

type Props = {
  onAfterGenerate: () => void
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export function GenerarDesdeCierre({ onAfterGenerate }: Props) {
  const [anio, setAnio] = useState(String(CURRENT_YEAR))
  const [mes,  setMes]  = useState(String(new Date().getMonth() + 1))

  const [preview,  setPreview]  = useState<Preview | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  async function handlePreview() {
    setError(null)
    setSuccess(null)
    setPreview(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/transferencias/preview?anio=${anio}&mes=${mes}`)
      const data = await res.json() as Preview & { error?: string }
      if (!res.ok) { setError(data.error ?? 'Error al cargar preview.'); return }
      setPreview(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerar() {
    if (!preview) return
    setError(null)
    setSuccess(null)
    setGenerando(true)
    try {
      const res = await fetch('/api/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio: Number(anio), mes: Number(mes) }),
      })
      const data = await res.json() as { ok?: boolean; created?: number; error?: string }
      if (!res.ok) { setError(data.error ?? 'Error al generar transferencias.'); return }
      setSuccess(`${data.created ?? 0} transferencia${(data.created ?? 0) !== 1 ? 's' : ''} generada${(data.created ?? 0) !== 1 ? 's' : ''} correctamente.`)
      setPreview(null)
      onAfterGenerate()
    } finally {
      setGenerando(false)
    }
  }

  const hayNuevas = preview?.socios.some(s => !s.yaExisteUYU || (!s.yaExisteUSD && s.montoUsd !== null))

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-950">Generar transferencias desde cierre mensual</h2>
        <p className="mt-0.5 text-xs text-slate-500">Los montos se calculan desde el resultado neto del cierre del período (descontando gastos).</p>
      </div>

      {/* Selector de período */}
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Año</label>
          <select
            className="h-8 rounded-md border border-slate-300 px-2 text-sm"
            value={anio}
            onChange={e => { setAnio(e.target.value); setPreview(null); setError(null); setSuccess(null) }}
          >
            {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Mes</label>
          <select
            className="h-8 rounded-md border border-slate-300 px-2 text-sm"
            value={mes}
            onChange={e => { setMes(e.target.value); setPreview(null); setError(null); setSuccess(null) }}
          >
            {MESES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
          </select>
        </div>
        <button
          className="h-8 rounded-md bg-slate-800 px-4 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          disabled={loading}
          onClick={() => void handlePreview()}
        >
          {loading ? 'Cargando…' : 'Ver preview'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-6 py-3">Socio</th>
                  <th className="whitespace-nowrap px-6 py-3 text-right">Monto UYU (neto)</th>
                  <th className="whitespace-nowrap px-6 py-3">Cuenta UYU</th>
                  <th className="whitespace-nowrap px-6 py-3 text-right">Monto USD</th>
                  <th className="whitespace-nowrap px-6 py-3">Cuenta USD</th>
                  <th className="whitespace-nowrap px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.socios.map(s => (
                  <tr key={s.socioId} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-900">{s.socioNombre}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-slate-900">
                      {fmt(s.montoPesos)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-slate-500">
                      {s.cuentaPesos ?? <span className="text-slate-300">Sin configurar</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums text-slate-900">
                      {s.montoUsd !== null ? fmt(s.montoUsd) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-slate-500">
                      {s.montoUsd !== null ? (s.cuentaUsd ?? <span className="text-slate-300">Sin configurar</span>) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {s.yaExisteUYU && s.yaExisteUSD
                        ? <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Ya generado</span>
                        : s.yaExisteUYU
                          ? <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">UYU ya generado</span>
                          : <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Nuevo</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Montos calculados desde el cierre de <strong>{MESES[Number(mes) - 1]} {anio}</strong> — resultado neto después de gastos.
            </p>
            <button
              className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={generando || !hayNuevas}
              onClick={() => void handleGenerar()}
            >
              {generando ? 'Generando…' : hayNuevas ? 'Confirmar y generar' : 'Ya generadas'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
