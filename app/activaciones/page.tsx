'use client'

import { useEffect, useState } from 'react'

type ActivacionRow = {
  id: string
  mid: string
  chip: string
  empresa: string
  empresaNombreArchivo: string
  tipoActivacion: string
  lote: string
  estadoActivacion: string
  fechaImportacion: string | null
  fechaActivacion: string | null
  situacion: string
}

type EmpresaOption = { id: string; nombre: string }

type ApiResponse = {
  data: ActivacionRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  filters: { empresas: EmpresaOption[] }
}

const months = [
  ['1', 'Enero'],
  ['2', 'Febrero'],
  ['3', 'Marzo'],
  ['4', 'Abril'],
  ['5', 'Mayo'],
  ['6', 'Junio'],
  ['7', 'Julio'],
  ['8', 'Agosto'],
  ['9', 'Septiembre'],
  ['10', 'Octubre'],
  ['11', 'Noviembre'],
  ['12', 'Diciembre'],
]

type Filters = {
  anio: string
  mes: string
  empresaId: string
  importacionId: string
  mid: string
  chip: string
  lote: string
  estadoActivacion: string
  activacionCompletada: string
}

const emptyFilters: Filters = {
  anio: '',
  mes: '',
  empresaId: '',
  importacionId: '',
  mid: '',
  chip: '',
  lote: '',
  estadoActivacion: '',
  activacionCompletada: '',
}

function hasActiveFilter(filters: Filters) {
  return Object.values(filters).some((v) => v !== '')
}

function buildParams(filters: Filters, page: number): URLSearchParams {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', '100')
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return params
}

export default function ActivacionesPage() {
  const [pendingFilters, setPendingFilters] = useState<Filters>(emptyFilters)
  const [activeFilters, setActiveFilters] = useState<Filters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])

  // Load empresa list on mount
  useEffect(() => {
    fetch('/api/activaciones?pageSize=1')
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        if (data.filters?.empresas) setEmpresas(data.filters.empresas)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!hasActiveFilter(activeFilters)) {
      setResult(null)
      return
    }

    setLoading(true)
    fetch(`/api/activaciones?${buildParams(activeFilters, page).toString()}`)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        setResult(data)
        if (data.filters?.empresas?.length) setEmpresas(data.filters.empresas)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeFilters, page])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setActiveFilters({ ...pendingFilters })
  }

  function handleClear() {
    setPendingFilters(emptyFilters)
    setActiveFilters(emptyFilters)
    setPage(1)
    setResult(null)
  }

  function handleExport() {
    const params = buildParams(activeFilters, 1)
    // remove pagination params not needed for export
    params.delete('page')
    params.delete('pageSize')
    setExporting(true)
    const url = `/api/activaciones/export?${params.toString()}`
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setExporting(false), 2000)
  }

  const rows = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 1
  const pageSize = result?.pageSize ?? 100
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const filterActive = hasActiveFilter(activeFilters)

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Activaciones</p>
        <h1 className="mt-1 text-2xl font-bold">Activaciones importadas</h1>
        <p className="mt-1 text-sm opacity-80">Consulta paginada de filas importadas desde CSV.</p>
      </div>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-4" onSubmit={handleSubmit}>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Anio
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.anio}
            onChange={(e) => setPendingFilters((f) => ({ ...f, anio: e.target.value }))}
            placeholder="2026"
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Mes
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.mes}
            onChange={(e) => setPendingFilters((f) => ({ ...f, mes: e.target.value }))}
          >
            <option value="">Todos</option>
            {months.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.empresaId}
            onChange={(e) => setPendingFilters((f) => ({ ...f, empresaId: e.target.value }))}
          >
            <option value="">Todas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Importación ID
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.importacionId}
            onChange={(e) => setPendingFilters((f) => ({ ...f, importacionId: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          MID
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.mid}
            onChange={(e) => setPendingFilters((f) => ({ ...f, mid: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Chip
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.chip}
            onChange={(e) => setPendingFilters((f) => ({ ...f, chip: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Lote
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.lote}
            onChange={(e) => setPendingFilters((f) => ({ ...f, lote: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Estado
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.estadoActivacion}
            onChange={(e) => setPendingFilters((f) => ({ ...f, estadoActivacion: e.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Situacion
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.activacionCompletada}
            onChange={(e) => setPendingFilters((f) => ({ ...f, activacionCompletada: e.target.value }))}
          >
            <option value="">Todas</option>
            <option value="true">Completada</option>
            <option value="false">Sin fecha real</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Filtrar
          </button>
          <button
            className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600"
            type="button"
            onClick={handleClear}
          >
            Limpiar
          </button>
          <button
            className="h-10 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 enabled:bg-emerald-700 enabled:text-white enabled:hover:bg-emerald-800"
            type="button"
            disabled={!filterActive || exporting}
            title={!filterActive ? 'Aplicá al menos un filtro para exportar' : undefined}
            onClick={handleExport}
          >
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </form>

      {!filterActive && !loading ? (
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-slate-500">
          Aplicá al menos un filtro para ver las activaciones
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-md bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>
              {total === 0
                ? 'Sin resultados'
                : `Mostrando ${from}-${to} de ${total} activaciones`}
            </p>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-slate-400 disabled:cursor-not-allowed enabled:border-slate-300 enabled:font-semibold enabled:text-slate-700"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-slate-400 disabled:cursor-not-allowed enabled:border-slate-300 enabled:font-semibold enabled:text-slate-700"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <Th>MID</Th>
                  <Th>Chip</Th>
                  <Th>Empresa</Th>
                  <Th>Empresa archivo</Th>
                  <Th>Tipo activacion</Th>
                  <Th>Lote</Th>
                  <Th>Estado</Th>
                  <Th>Fecha importacion</Th>
                  <Th>Fecha activacion real</Th>
                  <Th>Situacion</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-t border-slate-200" key={row.id}>
                    <Td>{row.mid}</Td>
                    <Td>{row.chip}</Td>
                    <Td>{row.empresa}</Td>
                    <Td>{row.empresaNombreArchivo}</Td>
                    <Td>{row.tipoActivacion || 'Sin dato'}</Td>
                    <Td>{row.lote}</Td>
                    <Td>{row.estadoActivacion}</Td>
                    <Td>{formatDate(row.fechaImportacion)}</Td>
                    <Td>{formatDate(row.fechaActivacion)}</Td>
                    <Td>{row.situacion}</Td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <Td colSpan={10}>No hay activaciones para los filtros seleccionados.</Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-slate-700" colSpan={colSpan}>
      {children}
    </td>
  )
}

function formatDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}
