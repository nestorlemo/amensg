import Link from 'next/link'
import type { ReactNode } from 'react'

import { AnularImportacionForm } from '@/components/anular-importacion-form'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getImportaciones } from '@/lib/read-models'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
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

export default async function ImportacionesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const user = await getCurrentUser()
  const { rows } = await getImportaciones(params)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-slate-500">Importaciones</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Importaciones confirmadas</h1>
          <p className="mt-2 text-sm text-slate-600">Consulta de archivos importados y sus totales operativos.</p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          href="/importaciones/nueva"
        >
          Nueva importacion
        </Link>
      </header>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-4" method="get">
        <FilterInput label="Anio" name="anio" value={stringValue(params.anio)} placeholder="2026" />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Mes
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            defaultValue={stringValue(params.mes)}
            name="mes"
          >
            <option value="">Todos</option>
            {months.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <FilterInput label="Estado" name="estado" value={stringValue(params.estado)} placeholder="CONFIRMADA" />
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Filtrar
          </button>
          <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/importaciones">
            Limpiar
          </Link>
        </div>
      </form>

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
                    {isAdmin(user) && isConfirmada(row.estado) ? <AnularImportacionForm importacionId={row.id} /> : null}
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
    </div>
  )
}

function FilterInput({
  label,
  name,
  value,
  placeholder,
}: {
  label: string
  name: string
  value: string
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
      />
    </label>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-slate-700" colSpan={colSpan}>
      {children}
    </td>
  )
}

function stringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}

function isConfirmada(estado: string) {
  return estado.trim().toUpperCase() === 'CONFIRMADA'
}

function estadoClass(estado: string) {
  return estado.trim().toUpperCase() === 'ANULADA'
    ? 'bg-red-50 text-red-700'
    : 'bg-emerald-50 text-emerald-700'
}
