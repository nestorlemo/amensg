'use client'

import { useState } from 'react'

import { MonthInput } from '@/components/month-input'

import { EmpresaOption, FacturacionRow, fmt, formatPeriod } from './types'

export function ActivacionesDisponibles({
  empresasOpts,
  onFacturado,
}: {
  empresasOpts: EmpresaOption[]
  onFacturado: () => void
}) {
  const [fDesde,   setFDesde]   = useState('')
  const [fHasta,   setFHasta]   = useState('')
  const [fEmpresa, setFEmpresa] = useState('')
  const [facturaciones, setFacturaciones] = useState<FacturacionRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [buscando,  setBuscando]  = useState(false)
  const [searched,  setSearched]  = useState(false)
  const [marcando,        setMarcando]        = useState(false)
  const [agruparFactura,  setAgruparFactura]  = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault()
    setBuscando(true)
    setSearched(false)
    setFacturaciones([])
    setSelectedIds(new Set())
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const qs = new URLSearchParams()
      if (fDesde)   qs.set('desde', fDesde)
      if (fHasta)   qs.set('hasta', fHasta)
      if (fEmpresa) qs.set('empresaId', fEmpresa)
      const res = await fetch(`/api/cobros-activaciones?${qs}`)
      const data = (await res.json()) as { facturaciones?: FacturacionRow[]; error?: string }
      if (!res.ok) { setErrorMsg(data.error ?? 'Error al buscar.'); return }
      const rows = data.facturaciones ?? []
      setFacturaciones(rows)
      setSelectedIds(new Set(rows.map((r) => r.id)))
      setSearched(true)
    } finally {
      setBuscando(false)
    }
  }

  function toggleAll() {
    if (selectedIds.size === facturaciones.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(facturaciones.map((r) => r.id)))
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selRows  = facturaciones.filter((r) => selectedIds.has(r.id))
  const totalSin = selRows.reduce((s, r) => s + Number(r.totalSinIva), 0)
  const totalIva = selRows.reduce((s, r) => s + Number(r.iva),         0)
  const totalCon = selRows.reduce((s, r) => s + Number(r.totalConIva), 0)

  async function handleMarcarFacturado() {
    if (selectedIds.size === 0) return
    setMarcando(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/cobros-activaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facturacionIds: Array.from(selectedIds),
          estado: 'FACTURADO',
          agruparEnFactura: agruparFactura,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; created?: number; facturaId?: string | null; error?: string }
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error al registrar.')
      } else {
        const facturaMsg = data.facturaId ? ' (factura agrupada creada)' : ''
        setSuccessMsg(`Cobro creado agrupando ${data.created ?? selectedIds.size} empresa(s) — estado: FACTURADO${facturaMsg}.`)
        setFacturaciones([])
        setSelectedIds(new Set())
        setSearched(false)
        onFacturado()
      }
    } finally {
      setMarcando(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-800">Activaciones disponibles para facturar</h2>
      </div>
      <div className="p-6 space-y-5">
        <form onSubmit={(e) => void handleBuscar(e)} className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Importación desde
            <MonthInput
              value={fDesde}
              onChange={setFDesde}
              className="h-10 w-32 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Importación hasta
            <MonthInput
              value={fHasta}
              onChange={setFHasta}
              className="h-10 w-32 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Empresa
            <select
              value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)}
              className="h-10 w-48 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Todas</option>
              {empresasOpts.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
          <button
            type="submit" disabled={buscando}
            className="h-10 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {successMsg && <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-800">{successMsg}</p>}
        {errorMsg   && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-medium text-red-800">{errorMsg}</p>}

        {searched && facturaciones.length === 0 && (
          <p className="text-sm text-slate-500">No hay activaciones sin facturar para el período seleccionado.</p>
        )}

        {facturaciones.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === facturaciones.length && facturaciones.length > 0}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Empresa</th>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-right">Activaciones</th>
                    <th className="px-4 py-3 text-right">S/IVA</th>
                    <th className="px-4 py-3 text-right">IVA</th>
                    <th className="px-4 py-3 text-right">C/IVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facturaciones.map((r) => (
                    <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(r.id) ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleOne(r.id)} className="rounded" />
                      </td>
                      <td className="px-4 py-3 font-medium">{r.empresa}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatPeriod(r.anio, r.mes)}</td>
                      <td className="px-4 py-3 text-right">{r.cantidadActivaciones}</td>
                      <td className="px-4 py-3 text-right">${fmt(r.totalSinIva)}</td>
                      <td className="px-4 py-3 text-right">${fmt(r.iva)}</td>
                      <td className="px-4 py-3 text-right font-semibold">${fmt(r.totalConIva)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selRows.length > 0 && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Resumen — {selRows.length} empresa{selRows.length !== 1 ? 's' : ''} seleccionada{selRows.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total S/IVA</p>
                    <p className="text-base font-bold text-blue-900">${fmt(totalSin)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">IVA</p>
                    <p className="text-base font-bold text-blue-900">${fmt(totalIva)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total C/IVA</p>
                    <p className="text-base font-bold text-blue-900">${fmt(totalCon)}</p>
                  </div>
                </div>
              </div>
            )}

            {selRows.length > 1 && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={agruparFactura}
                  onChange={(e) => setAgruparFactura(e.target.checked)}
                  className="rounded"
                />
                Agrupar en una sola factura (PDF único para todas las empresas)
              </label>
            )}

            <button
              onClick={() => void handleMarcarFacturado()}
              disabled={selectedIds.size === 0 || marcando}
              className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {marcando ? 'Registrando...' : `Marcar como facturado (${selectedIds.size} empresa${selectedIds.size !== 1 ? 's' : ''})`}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
