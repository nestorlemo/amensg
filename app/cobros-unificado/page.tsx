'use client'

import { useEffect, useRef, useState } from 'react'

import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/ui/primitives'

type CobroRow = {
  id: string
  tipo: string
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

type Kpis = {
  totalPendienteUYU: string
  cobradoEsteMesUYU: string
  pendienteCount: number
  empresasConDeuda: number
}

type ResumenEmpresa = {
  empresaId: string
  empresa: string
  sinIva: number
  iva: number
  conIva: number
  count: number
  allCobrado: boolean
}

type Totals = {
  sinIvaPendiente: string
  sinIvaCobrado: string
  iva: string
  conIvaPendiente: string
  conIvaCobrado: string
}

type ApiResponse = {
  data: CobroRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  kpis: Kpis
  resumen: ResumenEmpresa[]
  totals: Totals
}

type Filters = {
  tipo: string
  empresaId: string
  anio: string
  mes: string
  estado: string
}

const fmt = (val: string) =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val))

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function TipoBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    ACTIVACIONES: 'bg-blue-100 text-blue-800',
    DESARROLLO: 'bg-green-100 text-green-800',
    ADICIONAL: 'bg-cyan-100 text-cyan-800',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colors[tipo] ?? 'bg-slate-100 text-slate-700'}`}>
      {tipo}
    </span>
  )
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

export default function CobrosUnificadoPage() {
  const [rows, setRows] = useState<CobroRow[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [resumen, setResumen] = useState<ResumenEmpresa[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [showResumen, setShowResumen] = useState(true)
  const pageSize = 50

  const [filters, setFilters] = useState<Filters>({
    tipo: '',
    empresaId: '',
    anio: '',
    mes: '',
    estado: '',
  })
  const [pendingFilters, setPendingFilters] = useState<Filters>(filters)

  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([])

  // Modal state
  const [cobrandoId, setCobrandoId] = useState<string | null>(null)
  const [fechaCobro, setFechaCobro] = useState('')

  // PDF upload ref
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/empresas')
      .then((r) => r.json())
      .then((d) => setEmpresas(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.tipo) params.set('tipo', filters.tipo)
    if (filters.empresaId) params.set('empresaId', filters.empresaId)
    if (filters.anio) params.set('anio', filters.anio)
    if (filters.mes) params.set('mes', filters.mes)
    if (filters.estado) params.set('estado', filters.estado)
    params.set('page', String(page))

    setLoading(true)
    fetch(`/api/cobros-unificado?${params}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setRows(d.data)
        setKpis(d.kpis)
        setResumen(d.resumen ?? [])
        setTotals(d.totals ?? null)
        setTotal(d.total)
        setTotalPages(d.totalPages)
      })
      .finally(() => setLoading(false))
  }, [filters, page])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setFilters(pendingFilters)
  }

  function handleClearFilters() {
    const empty: Filters = { tipo: '', empresaId: '', anio: '', mes: '', estado: '' }
    setPendingFilters(empty)
    setFilters(empty)
    setPage(1)
  }

  async function handleMarcarCobrado() {
    if (!cobrandoId) return
    await fetch(`/api/cobros-unificado/${cobrandoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'COBRADO', fechaCobro: fechaCobro || null }),
    })
    setCobrandoId(null)
    setFechaCobro('')
    setFilters((f) => ({ ...f })) // re-fetch
  }

  async function handleUploadPdf(id: string, file: File) {
    const fd = new FormData()
    fd.append('file', file)
    await fetch(`/api/cobros-unificado/${id}/pdf`, { method: 'POST', body: fd })
    setFilters((f) => ({ ...f }))
  }

  const startIndex = (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)

  return (
    <div className="space-y-6">
      <PageHeader
        section="COBROS"
        title="Gestión de Cobros"
        description="Vista unificada de cobros por activaciones, desarrollo e ingresos adicionales."
      />

      {/* KPI Cards */}
      <section className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Total pendiente (UYU)"
          value={kpis ? fmt(kpis.totalPendienteUYU) : null}
          accent="amber"
        />
        <StatCard
          label="Cobrado este mes (UYU)"
          value={kpis ? fmt(kpis.cobradoEsteMesUYU) : null}
          accent="green"
        />
        <StatCard
          label="Facturas pendientes"
          value={kpis ? kpis.pendienteCount : null}
          accent="default"
        />
        <StatCard
          label="Empresas con deuda"
          value={kpis ? kpis.empresasConDeuda : null}
          accent="red"
        />
      </section>

      {/* Resumen por empresa */}
      {resumen.length > 0 && (
        <section className="rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Resumen por empresa</h2>
            <button
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
              type="button"
              onClick={() => setShowResumen((v) => !v)}
            >
              {showResumen ? 'Ocultar resumen' : 'Mostrar resumen'}
            </button>
          </div>
          {showResumen && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Empresa</th>
                    <th className="px-4 py-2 text-right">Facturas</th>
                    <th className="px-4 py-2 text-right">S/IVA (UYU)</th>
                    <th className="px-4 py-2 text-right">IVA (UYU)</th>
                    <th className="px-4 py-2 text-right">C/IVA (UYU)</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.map((r) => (
                    <tr key={r.empresaId} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{r.empresa}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{r.count}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{fmt(r.sinIva.toFixed(2))}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{fmt(r.iva.toFixed(2))}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{fmt(r.conIva.toFixed(2))}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${r.allCobrado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {r.allCobrado ? 'COBRADO' : 'PENDIENTE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Filters */}
      <form
        className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-6"
        onSubmit={handleFilter}
      >
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Tipo
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={pendingFilters.tipo}
            onChange={(e) => setPendingFilters((f) => ({ ...f, tipo: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="ACTIVACIONES">Activaciones</option>
            <option value="DESARROLLO">Desarrollo</option>
            <option value="ADICIONAL">Adicional</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={pendingFilters.empresaId}
            onChange={(e) => setPendingFilters((f) => ({ ...f, empresaId: e.target.value }))}
          >
            <option value="">Todas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Año
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="2026"
            type="number"
            value={pendingFilters.anio}
            onChange={(e) => setPendingFilters((f) => ({ ...f, anio: e.target.value }))}
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Mes
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            max={12}
            min={1}
            placeholder="1-12"
            type="number"
            value={pendingFilters.mes}
            onChange={(e) => setPendingFilters((f) => ({ ...f, mes: e.target.value }))}
          />
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          Estado
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={pendingFilters.estado}
            onChange={(e) => setPendingFilters((f) => ({ ...f, estado: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="FACTURADO">Facturado</option>
            <option value="COBRADO">Cobrado</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            type="submit"
          >
            Filtrar
          </button>
          <button
            className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600 hover:text-slate-900"
            type="button"
            onClick={handleClearFilters}
          >
            Limpiar
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3">Moneda</th>
              <th className="px-4 py-3 text-right">Monto S/IVA</th>
              <th className="px-4 py-3 text-right">IVA</th>
              <th className="px-4 py-3 text-right">Monto C/IVA</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha cobro</th>
              <th className="px-4 py-3">PDF</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={11}>Cargando...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={11}>No hay cobros para los filtros seleccionados.</td>
              </tr>
            ) : (
              <>
                {rows.map((row) => (
                  <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors" key={row.id}>
                    <td className="px-4 py-3"><TipoBadge tipo={row.tipo} /></td>
                    <td className="px-4 py-3 font-medium">{row.empresa}</td>
                    <td className="px-4 py-3">{formatPeriod(row.anio, row.mes)}</td>
                    <td className="px-4 py-3">{row.moneda}</td>
                    <td className="px-4 py-3 text-right">{fmt(row.montoSinIva)}</td>
                    <td className="px-4 py-3 text-right">{fmt(row.iva)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(row.montoConIva)}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={row.estado} /></td>
                    <td className="px-4 py-3">
                      {row.fechaCobro ? new Intl.DateTimeFormat('es-UY').format(new Date(row.fechaCobro)) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {row.urlPdfFactura ? (
                        <div className="flex gap-1">
                          <a
                            className="rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            href={`/api/cobros-unificado/${row.id}/pdf`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Ver PDF
                          </a>
                          <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                            Reemplazar
                            <input accept="application/pdf" className="hidden" type="file"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadPdf(row.id, f) }} />
                          </label>
                        </div>
                      ) : (
                        <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Subir PDF
                          <input accept="application/pdf" className="hidden"
                            ref={(el) => { fileInputRefs.current[row.id] = el }} type="file"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadPdf(row.id, f) }} />
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.estado === 'FACTURADO' && (
                        <button
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                          type="button"
                          onClick={() => { setCobrandoId(row.id); setFechaCobro('') }}
                        >
                          Marcar cobrado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {totals && (
                  <tr className="border-t-2 border-slate-300 bg-slate-100 text-xs font-semibold text-slate-700">
                    <td className="px-4 py-3" colSpan={4}>TOTALES (UYU)</td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-emerald-700">{fmt(totals.sinIvaCobrado)}</div>
                      <div className="text-amber-700">{fmt(totals.sinIvaPendiente)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{fmt(totals.iva)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-emerald-700">{fmt(totals.conIvaCobrado)}</div>
                      <div className="text-amber-700">{fmt(totals.conIvaPendiente)}</div>
                    </td>
                    <td className="px-4 py-3" colSpan={4}>
                      <span className="mr-2 text-emerald-700">■ cobrado</span>
                      <span className="text-amber-700">■ pendiente</span>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Mostrando {startIndex}-{endIndex} de {total}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 transition-colors"
              disabled={page <= 1}
              type="button"
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 transition-colors"
              disabled={page >= totalPages}
              type="button"
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal: Marcar cobrado */}
      {cobrandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Marcar como cobrado</h2>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Fecha de cobro
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                type="date"
                value={fechaCobro}
                onChange={(e) => setFechaCobro(e.target.value)}
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                type="button"
                onClick={() => { setCobrandoId(null); setFechaCobro('') }}
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                type="button"
                onClick={handleMarcarCobrado}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
