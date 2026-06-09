'use client'

import { useCallback, useEffect, useState } from 'react'
import { fmt, mesNombre, TIPO_BADGE, type Cobro, type Empresa } from './types'
import { Badge } from './primitives'

type Props = {
  empresas: Empresa[]
  onAfterGenerate: () => void
}

export function CobrosDisponibles({ empresas, onAfterGenerate }: Props) {
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [selectedCobros, setSelectedCobros] = useState<Set<string>>(new Set())
  const [loadingCobros, setLoadingCobros] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cobroEmpresaId, setCobroEmpresaId] = useState('')
  const [cobroDesde, setCobroDesde] = useState('')
  const [cobroHasta, setCobroHasta] = useState('')

  const fetchCobros = useCallback(async () => {
    setLoadingCobros(true)
    try {
      const params = new URLSearchParams()
      if (cobroEmpresaId) params.set('empresaId', cobroEmpresaId)
      if (cobroDesde) params.set('fechaDesde', cobroDesde)
      if (cobroHasta) params.set('fechaHasta', cobroHasta)
      const res = await fetch(`/api/transferencias/cobros-disponibles?${params}`)
      const data = await res.json() as { cobros?: Cobro[] }
      setCobros(data.cobros ?? [])
      setSelectedCobros(new Set())
    } finally {
      setLoadingCobros(false)
    }
  }, [cobroEmpresaId, cobroDesde, cobroHasta])

  useEffect(() => { void fetchCobros() }, [fetchCobros])

  async function handleGenerar() {
    if (selectedCobros.size === 0) return
    setError(null)
    setGenerando(true)
    try {
      const res = await fetch('/api/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cobroIds: Array.from(selectedCobros) }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Error al generar transferencias.')
      }
      await fetchCobros()
      onAfterGenerate()
    } finally {
      setGenerando(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-950">Cobros disponibles para transferir</h2>
        <p className="mt-0.5 text-xs text-slate-500">Cobros en estado COBRADO sin transferencias generadas.</p>
      </div>

      {/* Filtros cobros */}
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Empresa</label>
          <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={cobroEmpresaId} onChange={e => setCobroEmpresaId(e.target.value)}>
            <option value="">Todas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Fecha cobro desde</label>
          <input type="date" className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={cobroDesde} onChange={e => setCobroDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Hasta</label>
          <input type="date" className="h-8 rounded-md border border-slate-300 px-2 text-sm" value={cobroHasta} onChange={e => setCobroHasta(e.target.value)} />
        </div>
        <button className="h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-900" onClick={() => { setCobroEmpresaId(''); setCobroDesde(''); setCobroHasta('') }}>Limpiar</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={cobros.length > 0 && selectedCobros.size === cobros.length}
                  onChange={e => setSelectedCobros(e.target.checked ? new Set(cobros.map(c => c.id)) : new Set())}
                />
              </th>
              <th className="whitespace-nowrap px-4 py-3">Tipo</th>
              <th className="whitespace-nowrap px-4 py-3">Empresa</th>
              <th className="whitespace-nowrap px-4 py-3">Período</th>
              <th className="whitespace-nowrap px-4 py-3">Moneda</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">S/IVA</th>
              <th className="whitespace-nowrap px-4 py-3">Estado cobro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingCobros ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Cargando…</td></tr>
            ) : cobros.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay cobros disponibles.</td></tr>
            ) : cobros.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedCobros.has(c.id)}
                    onChange={e => {
                      const next = new Set(selectedCobros)
                      if (e.target.checked) next.add(c.id)
                      else next.delete(c.id)
                      setSelectedCobros(next)
                    }}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Badge label={c.tipo} cls={TIPO_BADGE[c.tipo] ?? 'bg-slate-100 text-slate-700'} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{c.empresa}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{mesNombre(c.mes)} {c.anio}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{c.moneda}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">{fmt(c.montoSinIva)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">COBRADO</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <span className="text-xs text-slate-500">{selectedCobros.size} cobro{selectedCobros.size !== 1 ? 's' : ''} seleccionado{selectedCobros.size !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-3">
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <button
            className="h-9 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={selectedCobros.size === 0 || generando}
            onClick={() => void handleGenerar()}
          >
            {generando ? 'Generando…' : 'Generar transferencias'}
          </button>
        </div>
      </div>
    </section>
  )
}
