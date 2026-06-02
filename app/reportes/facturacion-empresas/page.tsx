'use client'

import { useState } from 'react'

import { PageHeader } from '@/components/page-header'

type DetalleRow = {
  fecha: string
  tipo: string
  cantidad: number
  totalSinIva: number
  iva: number
  totalConIva: number
}

type EmpresaData = {
  nombre: string
  totalRegistros: number
  totalSinIva: number
  iva: number
  totalConIva: number
  detalle: DetalleRow[]
}

type ReportData = {
  periodo: { anio: number; mes: number }
  precioUnitario: number
  empresas: EmpresaData[]
}

export default function FacturacionEmpresasPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [anio, setAnio] = useState(String(currentYear))
  const [mes, setMes] = useState(String(currentMonth))
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setData(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/reportes/facturacion-empresas/export?anio=${anio}&mes=${mes}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.message ?? 'Error al generar el reporte.')
        return
      }
      setData(json as ReportData)
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  function handleExportXlsx() {
    window.location.href = `/api/reportes/facturacion-empresas/export/xlsx?anio=${anio}&mes=${mes}`
  }

  const mesLabel = data
    ? new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(
        new Date(data.periodo.anio, data.periodo.mes - 1, 1)
      )
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        section="Reportes"
        title="Facturación por empresa"
        description="Reporte de activaciones agrupadas por empresa y fecha de importación con IVA."
      />

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleGenerate}>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Año
            <input
              className="mt-1 block h-9 w-28 rounded-md border border-slate-300 px-3 text-sm"
              min="2020"
              name="anio"
              onChange={(e) => setAnio(e.target.value)}
              placeholder={String(currentYear)}
              type="number"
              value={anio}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Mes
            <input
              className="mt-1 block h-9 w-20 rounded-md border border-slate-300 px-3 text-sm"
              max="12"
              min="1"
              name="mes"
              onChange={(e) => setMes(e.target.value)}
              placeholder={String(currentMonth)}
              type="number"
              value={mes}
            />
          </label>
          <button
            className="h-9 rounded-md bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Generando…' : 'Generar reporte'}
          </button>
          {data ? (
            <button
              className="h-9 rounded-md border border-emerald-600 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              onClick={handleExportXlsx}
              type="button"
            >
              Exportar Excel
            </button>
          ) : null}
        </form>
        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
      </section>

      {/* Preview */}
      {data ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950 capitalize">{mesLabel}</h2>
            <span className="text-sm text-slate-500">
              Precio unitario: <span className="font-semibold text-slate-800">${data.precioUnitario.toFixed(2)}</span>
            </span>
          </div>

          {data.empresas.length === 0 ? (
            <p className="text-sm text-slate-500">No hay activaciones para el período seleccionado.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <Th>Empresa</Th>
                    <Th align="right">Registros</Th>
                    <Th align="right">Total S/IVA ($)</Th>
                    <Th align="right">IVA ($)</Th>
                    <Th align="right">Total C/IVA ($)</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.empresas.map((emp) => (
                    <tr key={emp.nombre}>
                      <Td>{emp.nombre}</Td>
                      <Td align="right">{fmt(emp.totalRegistros, 0)}</Td>
                      <Td align="right">{fmt(emp.totalSinIva)}</Td>
                      <Td align="right">{fmt(emp.iva)}</Td>
                      <Td align="right">{fmt(emp.totalConIva)}</Td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <Td>Total</Td>
                    <Td align="right">{fmt(data.empresas.reduce((s, e) => s + e.totalRegistros, 0), 0)}</Td>
                    <Td align="right">{fmt(data.empresas.reduce((s, e) => s + e.totalSinIva, 0))}</Td>
                    <Td align="right">{fmt(data.empresas.reduce((s, e) => s + e.iva, 0))}</Td>
                    <Td align="right">{fmt(data.empresas.reduce((s, e) => s + e.totalConIva, 0))}</Td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3${align === 'right' ? ' text-right' : ''}`}>{children}</th>
  )
}

function Td({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-slate-700${align === 'right' ? ' tabular-nums text-right' : ''}`}>
      {children}
    </td>
  )
}

function fmt(value: number, decimals = 2) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}
