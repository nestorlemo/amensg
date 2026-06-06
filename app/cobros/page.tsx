'use client'

import { useEffect, useRef, useState } from 'react'

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
  const colors: Record<string, string> = {
    FACTURADO: 'bg-amber-100 text-amber-800',
    COBRADO:   'bg-emerald-100 text-emerald-800',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colors[estado] ?? 'bg-slate-100 text-slate-700'}`}>
      {estado}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FacturacionActivacionesPage() {
  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Section 1
  const [fAnio,    setFAnio]    = useState(String(currentYear))
  const [fMes,     setFMes]     = useState(String(currentMonth))
  const [fEmpresa, setFEmpresa] = useState('')
  const [facturaciones, setFacturaciones] = useState<FacturacionRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [buscando,  setBuscando]  = useState(false)
  const [searched,  setSearched]  = useState(false)
  const [marcando,  setMarcando]  = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  // Section 2
  const [hEmpresa, setHEmpresa]   = useState('')
  const [hEstado,  setHEstado]    = useState('')
  const [historial, setHistorial] = useState<CobroHistorial[]>([])
  const [loadingH,  setLoadingH]  = useState(false)
  const [uploadingPdf, setUploadingPdf]     = useState<string | null>(null)
  const [marcandoCobrado, setMarcandoCobrado] = useState<string | null>(null)
  const [fechaCobroMap, setFechaCobroMap]   = useState<Record<string, string>>({})

  const [empresasOpts, setEmpresasOpts] = useState<EmpresaOption[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      const qs = new URLSearchParams({ anio: fAnio, mes: fMes })
      if (fEmpresa) qs.set('empresaId', fEmpresa)
      const res = await fetch(`/api/cobros-activaciones?${qs}`)
      const data = (await res.json()) as { facturaciones?: FacturacionRow[] }
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
        body: JSON.stringify({ facturacionIds: Array.from(selectedIds) }),
      })
      const data = (await res.json()) as { ok?: boolean; created?: number; error?: string }
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Error al registrar.')
      } else {
        setSuccessMsg(`${data.created ?? selectedIds.size} cobro(s) registrados como FACTURADO.`)
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
    <div className="space-y-8">
      <PageHeader
        title="Facturación Activaciones"
        subtitle="Registrá las facturaciones de activaciones y gestioná su estado de cobro."
      />

      {/* ── Section 1: Disponibles ───────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-slate-800">Activaciones disponibles para facturar</h2>

        <form onSubmit={(e) => void handleBuscar(e)} className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Año
            <input
              type="number" value={fAnio} onChange={(e) => setFAnio(e.target.value)}
              className="h-10 w-24 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="2026"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Mes
            <input
              type="number" value={fMes} onChange={(e) => setFMes(e.target.value)}
              className="h-10 w-20 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="4"
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
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {searched && facturaciones.length === 0 && (
          <p className="text-sm text-slate-500">No hay activaciones sin facturar para el período seleccionado.</p>
        )}

        {facturaciones.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">
                      <input type="checkbox" checked={selectedIds.size === facturaciones.length} onChange={toggleAll} />
                    </th>
                    <th className="px-4 py-2 text-left">Empresa</th>
                    <th className="px-4 py-2 text-left">Período</th>
                    <th className="px-4 py-2 text-right">Activaciones</th>
                    <th className="px-4 py-2 text-right">S/IVA</th>
                    <th className="px-4 py-2 text-right">IVA</th>
                    <th className="px-4 py-2 text-right">C/IVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facturaciones.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleOne(r.id)} />
                      </td>
                      <td className="px-4 py-2">{r.empresa}</td>
                      <td className="px-4 py-2">{formatPeriod(r.anio, r.mes)}</td>
                      <td className="px-4 py-2 text-right">{r.cantidadActivaciones}</td>
                      <td className="px-4 py-2 text-right">${fmt(r.totalSinIva)}</td>
                      <td className="px-4 py-2 text-right">${fmt(r.iva)}</td>
                      <td className="px-4 py-2 text-right font-semibold">${fmt(r.totalConIva)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selRows.length > 0 && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm space-y-1">
                <p className="font-semibold text-blue-900">Resumen ({selRows.length} empresa{selRows.length !== 1 ? 's' : ''})</p>
                <p className="text-blue-800">Total S/IVA: <span className="font-semibold">${fmt(totalSin)}</span></p>
                <p className="text-blue-800">IVA: <span className="font-semibold">${fmt(totalIva)}</span></p>
                <p className="text-blue-800">Total C/IVA: <span className="font-semibold">${fmt(totalCon)}</span></p>
              </div>
            )}

            {successMsg && <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{successMsg}</p>}
            {errorMsg   && <p className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{errorMsg}</p>}

            <button
              onClick={() => void handleMarcarFacturado()}
              disabled={selectedIds.size === 0 || marcando}
              className="rounded-md bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {marcando ? 'Registrando...' : `Marcar como facturado (${selectedIds.size})`}
            </button>
          </>
        )}
      </section>

      {/* ── Section 2: Historial ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-slate-800">Historial de facturación</h2>

        <form onSubmit={(e) => { e.preventDefault(); void fetchHistorial() }} className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Empresa
            <select
              value={hEmpresa} onChange={(e) => setHEmpresa(e.target.value)}
              className="h-10 w-48 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Todas</option>
              {empresasOpts.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Estado
            <select
              value={hEstado} onChange={(e) => setHEstado(e.target.value)}
              className="h-10 w-36 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Todos</option>
              <option value="FACTURADO">FACTURADO</option>
              <option value="COBRADO">COBRADO</option>
            </select>
          </label>
          <button type="submit" className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            Buscar
          </button>
        </form>

        {loadingH ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-right">S/IVA</th>
                  <th className="px-4 py-3 text-right">IVA</th>
                  <th className="px-4 py-3 text-right">C/IVA</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha cobro</th>
                  <th className="px-4 py-3 text-left">PDF</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-400">Sin registros.</td>
                  </tr>
                ) : historial.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{c.empresa}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatPeriod(c.anio, c.mes)}</td>
                    <td className="px-4 py-3 text-right">${fmt(c.montoSinIva)}</td>
                    <td className="px-4 py-3 text-right">${fmt(c.iva)}</td>
                    <td className="px-4 py-3 text-right font-semibold">${fmt(c.montoConIva)}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={c.estado} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.fechaCobro)}</td>
                    <td className="px-4 py-3">
                      {c.urlPdfFactura ? (
                        <div className="flex gap-1">
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
      </section>
    </div>
  )
}
