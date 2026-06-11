'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'

import { ReabrirCierreForm } from '@/components/reabrir-cierre-form'

type CierreRow = {
  id: string
  anio: number
  mes: number
  estado: string
  totalActivaciones: number
  totalIngresosSinIva: string
  totalGastos: string
  resultadoDistribuible: string
  cerradoAt: string | null
}

type Props = {
  rows: CierreRow[]
  isAdmin: boolean
}

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}

function isCerrado(estado: string) {
  return estado.trim().toUpperCase() === 'CERRADO'
}

function parseMesAnio(raw: string): { mes: number; anio: number } | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const mes = parseInt(m[1]!)
  const anio = parseInt(m[2]!)
  if (mes < 1 || mes > 12) return null
  return { mes, anio }
}

export function CierresTable({ rows, isAdmin }: Props) {
  const [desdeRaw, setDesdeRaw] = useState('')
  const [hastaRaw, setHastaRaw] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  const [desdeActivo, setDesdeActivo] = useState<{ mes: number; anio: number } | null>(null)
  const [hastaActivo, setHastaActivo] = useState<{ mes: number; anio: number } | null>(null)
  const [estadoActivo, setEstadoActivo] = useState('')

  const [errorDesde, setErrorDesde] = useState(false)
  const [errorHasta, setErrorHasta] = useState(false)

  function handleFiltrar() {
    const desde = desdeRaw ? parseMesAnio(desdeRaw) : null
    const hasta = hastaRaw ? parseMesAnio(hastaRaw) : null
    setErrorDesde(desdeRaw !== '' && desde === null)
    setErrorHasta(hastaRaw !== '' && hasta === null)
    if ((desdeRaw && !desde) || (hastaRaw && !hasta)) return
    setDesdeActivo(desde)
    setHastaActivo(hasta)
    setEstadoActivo(estadoFiltro)
  }

  function handleLimpiar() {
    setDesdeRaw('')
    setHastaRaw('')
    setEstadoFiltro('')
    setDesdeActivo(null)
    setHastaActivo(null)
    setEstadoActivo('')
    setErrorDesde(false)
    setErrorHasta(false)
  }

  const filtered = rows.filter(row => {
    if (desdeActivo) {
      if (row.anio < desdeActivo.anio || (row.anio === desdeActivo.anio && row.mes < desdeActivo.mes)) return false
    }
    if (hastaActivo) {
      if (row.anio > hastaActivo.anio || (row.anio === hastaActivo.anio && row.mes > hastaActivo.mes)) return false
    }
    if (estadoActivo && row.estado.trim().toUpperCase() !== estadoActivo) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Desde (mm/aaaa)</label>
            <input
              type="text"
              placeholder="01/2025"
              value={desdeRaw}
              onChange={e => { setDesdeRaw(e.target.value); setErrorDesde(false) }}
              className={`h-8 w-28 rounded-md border px-2 text-sm ${errorDesde ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hasta (mm/aaaa)</label>
            <input
              type="text"
              placeholder="12/2025"
              value={hastaRaw}
              onChange={e => { setHastaRaw(e.target.value); setErrorHasta(false) }}
              className={`h-8 w-28 rounded-md border px-2 text-sm ${errorHasta ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Estado</label>
            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="CERRADO">Cerrado</option>
              <option value="REABIERTO">Reabierto</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFiltrar}
              className="h-8 rounded-md bg-slate-800 px-4 text-xs font-semibold text-white hover:bg-slate-900"
              type="button"
            >
              Filtrar
            </button>
            <button
              onClick={handleLimpiar}
              className="h-8 rounded-md border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              type="button"
            >
              Limpiar
            </button>
          </div>
        </div>
        {(errorDesde || errorHasta) && (
          <p className="mt-2 text-xs text-red-600">Formato inválido. Usá mm/aaaa (ej: 03/2025).</p>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Período</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Estado</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Total activaciones</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Ingresos sin IVA</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Total gastos</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Resultado distribuible</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Fecha cierre</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr className="border-t border-slate-200" key={row.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatPeriod(row.anio, row.mes)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.estado}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.totalActivaciones}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.totalIngresosSinIva}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.totalGastos}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.resultadoDistribuible}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(row.cerradoAt)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex min-w-0 flex-wrap items-start gap-3">
                    <Link className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50" href={`/cierres/${row.id}`}>
                      <Eye size={12} />
                      Ver detalle
                    </Link>
                    {isAdmin && isCerrado(row.estado) ? <ReabrirCierreForm cierreId={row.id} /> : null}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700" colSpan={8}>
                  {rows.length === 0 ? 'No hay cierres mensuales registrados.' : 'No hay cierres que coincidan con los filtros.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
