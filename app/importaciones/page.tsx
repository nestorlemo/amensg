'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/index'

type ImportacionRow = {
  id: string
  anio: number
  mes: number
  nombreArchivo: string | null
  estado: string
  totalRows: number
  companies: number
  completedActivations: number
  withoutRealActivationDate: number
  creadaEn: string | null
}

type ApiResponse = {
  data: ImportacionRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

export default function ImportacionesPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ anio: '', mes: '', estado: '' })
  const [pendingFilters, setPendingFilters] = useState({ anio: '', mes: '', estado: '' })
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', '20')
    if (filters.anio) params.set('anio', filters.anio)
    if (filters.mes) params.set('mes', filters.mes)
    if (filters.estado) params.set('estado', filters.estado)

    fetch(`/api/importaciones?${params.toString()}`)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        setResult(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page, filters])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFilters({ ...pendingFilters })
    setPage(1)
  }

  function handleClear() {
    setPendingFilters({ anio: '', mes: '', estado: '' })
    setFilters({ anio: '', mes: '', estado: '' })
    setPage(1)
  }

  const rows = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 1
  const pageSize = result?.pageSize ?? 20
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Importaciones</p>
        <h1 className="mt-1 text-2xl font-bold">Importaciones confirmadas</h1>
        <p className="mt-1 text-sm opacity-80">Consulta de archivos importados y sus totales operativos.</p>
        <div className="mt-4">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            href="/importaciones/nueva"
          >
            Nueva importacion
          </Link>
        </div>
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
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Estado
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={pendingFilters.estado}
            onChange={(e) => setPendingFilters((f) => ({ ...f, estado: e.target.value }))}
            placeholder="CONFIRMADA"
          />
        </label>
        <div className="flex items-end gap-2">
          <Button variant="secondary" type="submit">
            Filtrar
          </Button>
          <Button variant="ghost" type="button" onClick={handleClear}>
            Limpiar
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-md bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>
              {total === 0
                ? 'Sin resultados'
                : `Mostrando ${from}-${to} de ${total} importaciones`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <Th>Periodo</Th>
                  <Th>Archivo</Th>
                  <Th>Estado</Th>
                  <Th>Total filas</Th>
                  <Th>Empresas</Th>
                  <Th>Completadas</Th>
                  <Th>Sin fecha real</Th>
                  <Th>Confirmada</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-t border-slate-200" key={row.id}>
                    <Td>{formatPeriod(row.anio, row.mes)}</Td>
                    <Td>{row.nombreArchivo ?? 'Sin nombre'}</Td>
                    <Td>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${estadoClass(row.estado)}`}>
                        {row.estado}
                      </span>
                    </Td>
                    <Td>{row.totalRows}</Td>
                    <Td>{row.companies}</Td>
                    <Td>{row.completedActivations}</Td>
                    <Td>{row.withoutRealActivationDate}</Td>
                    <Td>{formatDate(row.creadaEn)}</Td>
                    <Td>
                      <div className="flex min-w-0 flex-wrap items-start gap-3">
                        <Link className="py-2 font-semibold text-slate-950 underline" href={`/importaciones/${row.id}`}>
                          Ver detalle
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <Td colSpan={9}>No hay importaciones para los filtros seleccionados.</Td>
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

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}

function estadoClass(estado: string) {
  return estado.trim().toUpperCase() === 'ANULADA'
    ? 'bg-red-50 text-red-700'
    : 'bg-emerald-50 text-emerald-700'
}
