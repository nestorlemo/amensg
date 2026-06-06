'use client'

import { useEffect, useRef, useState } from 'react'

import { MonthInput } from '@/components/month-input'
import { PageHeader } from '@/components/page-header'

// ── Types ─────────────────────────────────────────────────────────────────────

type FacturacionRow = {
  id: string
  empresaId: string
  empresa: string
  anio: number
  mes: number
  cantidadActivaciones: number
  totalSinIva: string
  iva: string
  totalConIva: string
  estadoCobro: string
}

type CobroHistorial = {
  id: string
  empresa: string
  empresaId: string
  empresas: { id: string; nombre: string }[]
  anio: number
  mes: number
  montoSinIva: string
  iva: string
  montoConIva: string
  moneda: string
  estado: string
  fechaCobro: string | null
  urlPdfFactura: string | null
}

type EmpresaOption = { id: string; nombre: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (val: string | number) =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val))

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-UY').format(new Date(iso))
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'COBRADO')   return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">COBRADO</span>
  if (estado === 'FACTURADO') return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800">FACTURADO</span>
  return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">{estado}</span>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FacturacionActivacionesPage() {
  // Section 1
  const [fDesde,   setFDesde]   = useState('')
  const [fHasta,   setFHasta]   = useState('')
  const [fEmpresa, setFEmpresa] = useState('')
  const [facturaciones, setFacturaciones] = useState<FacturacionRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [buscando,  setBuscando]  = useState(false)
  const [searched,  setSearched]  = useState(false)
  const [marcando,  setMarcando]  = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  // Section 2
  const [hEmpresa, setHEmpresa]     = useState('')
  const [hEstado,  setHEstado]      = useState('')
  const [historial, setHistorial]   = useState<CobroHistorial[]>([])
  const [loadingH,  setLoadingH]    = useState(false)
  const [uploadingPdf, setUploadingPdf]       = useState<string | null>(null)
  const [marcandoCobrado, setMarcandoCobrado] = useState<string | null>(null)
  const [fechaCobroMap, setFechaCobroMap]     = useState<Record<string, string>>({})

  const [empresasOpts, setEmpresasOpts] = useState<EmpresaOption[]>([])
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/empresas?activo=true')
      .then((r) => r.json())
      .then((d: { empresas?: EmpresaOption[] }) => setEmpresasOpts(d.empresas ?? []))
      .catch(() => null)
    void fetchHistorial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Section 1 ─────────────────────────────────────────────────────────────

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
        body: JSON.stringify({ facturacionIds: Array.from(selectedIds), estado: 'FACTURADO' }),
      })
      const data = (await res.json()) as { ok?: boolean; created?: number; error?: string }
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error al registrar.')
      } else {
        setSuccessMsg(`Cobro creado agrupando ${data.created ?? selectedIds.size} empresa(s) — estado: FACTURADO.`)
        setFacturaciones([])
        setSelectedIds(new Set())
        setSearched(false)
        void fetchHistorial()
      }
    } finally {
      setMarcando(false)
    }
  }

  // ── Section 2 ─────────────────────────────────────────────────────────────

  async function fetchHistorial() {
    setLoadingH(true)
    try {
      const qs = new URLSearchParams({ tipo: 'ACTIVACIONES' })
      if (hEmpresa) qs.set('empresaId', hEmpresa)
      if (hEstado)  qs.set('estado',    hEstado)
      const res = await fetch(`/api/cobros-unificado?${qs}`)
      const data = (await res.json()) as { data?: CobroHistorial[] }
      setHistorial(data.data ?? [])
    } finally {
      setLoadingH(false)
    }
  }

  async function marcarCobrado(id: string) {
    const fecha = fechaCobroMap[id] ?? new Date().toISOString().split('T')[0]!
    setMarcandoCobrado(id)
    try {
      await fetch(`/api/cobros-unificado/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'COBRADO', fechaCobro: fecha }),
      })
      void fetchHistorial()
    } finally {
      setMarcandoCobrado(null)
    }
  }

  async function subirPdf(cobroId: string, file: File) {
    setUploadingPdf(cobroId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await fetch(`/api/cobros-unificado/${cobroId}/pdf`, { method: 'POST', body: fd })
      void fetchHistorial()
    } finally {
      setUploadingPdf(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        section="FACTURACIÓN"
        title="Facturación Activaciones"
        description="Registrá las facturaciones de activaciones y gestioná su estado de cobro."
      />

      {/* ── Section 1: Disponibles ───────────────────────────────────────── */}
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

      {/* ── Section 2: Historial ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Historial de facturación</h2>

          {/* Historial filters */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-xs font-medium text-slate-600">
              Empresa
              <select
                className="mt-1 block h-8 w-44 rounded-md border border-slate-300 px-2 text-xs"
                value={hEmpresa} onChange={(e) => setHEmpresa(e.target.value)}
              >
                <option value="">Todas</option>
                {empresasOpts.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Estado cobro
              <select
                className="mt-1 block h-8 w-36 rounded-md border border-slate-300 px-2 text-xs"
                value={hEstado} onChange={(e) => setHEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="FACTURADO">FACTURADO</option>
                <option value="COBRADO">COBRADO</option>
              </select>
            </label>
            <button
              onClick={() => void fetchHistorial()}
              className="h-8 rounded-md border border-slate-300 px-3 text-xs text-slate-600 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {loadingH ? (
            <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Empresas</th>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-right">S/IVA (UYU)</th>
                    <th className="px-4 py-3 text-right">IVA (UYU)</th>
                    <th className="px-4 py-3 text-right">C/IVA (UYU)</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fecha cobro</th>
                    <th className="px-4 py-3 text-left">PDF</th>
                    <th className="px-4 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">Sin registros.</td>
                    </tr>
                  ) : historial.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        {(c.empresas.length > 0 ? c.empresas : [{ id: c.empresaId, nombre: c.empresa }]).map((e) => (
                          <div key={e.id} className="text-xs font-medium">{e.nombre}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatPeriod(c.anio, c.mes)}</td>
                      <td className="px-4 py-3 text-right">${fmt(c.montoSinIva)}</td>
                      <td className="px-4 py-3 text-right">${fmt(c.iva)}</td>
                      <td className="px-4 py-3 text-right font-semibold">${fmt(c.montoConIva)}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.fechaCobro)}</td>
                      <td className="px-4 py-3">
                        {c.urlPdfFactura ? (
                          <div className="flex flex-wrap gap-1">
                            <a
                              href={`/api/cobros-unificado/${c.id}/pdf`}
                              target="_blank" rel="noopener noreferrer"
                              className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            >
                              Ver PDF
                            </a>
                            <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              {uploadingPdf === c.id ? 'Subiendo...' : 'Reemplazar'}
                              <input type="file" accept=".pdf" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirPdf(c.id, f) }}
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            {uploadingPdf === c.id ? 'Subiendo...' : 'Subir PDF'}
                            <input type="file" accept=".pdf" className="hidden"
                              ref={(el) => { fileInputRefs.current[c.id] = el }}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirPdf(c.id, f) }}
                            />
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.estado !== 'COBRADO' && (
                          <div className="flex gap-1 items-center">
                            <input
                              type="date"
                              value={fechaCobroMap[c.id] ?? new Date().toISOString().split('T')[0]!}
                              onChange={(e) => setFechaCobroMap((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className="h-8 rounded border border-slate-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <button
                              onClick={() => void marcarCobrado(c.id)}
                              disabled={marcandoCobrado === c.id}
                              className="rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {marcandoCobrado === c.id ? '...' : 'Marcar cobrado'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
