/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/page-header'
import { getActivaciones } from '@/lib/read-models'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ActivacionesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, pagination, filters } = await getActivaciones(params)
  const previousParams = pageHref(params, pagination.page - 1)
  const nextParams = pageHref(params, pagination.page + 1)

  return (
    <div className="space-y-6">
      <PageHeader section="Activaciones" title="Activaciones importadas" description="Consulta paginada de filas importadas desde CSV." />

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-4" method="get">
        <FilterInput label="Anio" name="anio" value={stringValue(params.anio)} placeholder="2026" />
        <FilterInput label="Mes" name="mes" value={stringValue(params.mes)} placeholder="4" />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            defaultValue={stringValue(params.empresaId)}
            name="empresaId"
          >
            <option value="">Todas</option>
            {filters.empresas.map((empresa: { id: string; nombre: string }) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>
        <FilterInput label="Importacion ID" name="importacionId" value={stringValue(params.importacionId)} />
        <FilterInput label="MID" name="mid" value={stringValue(params.mid)} />
        <FilterInput label="Chip" name="chip" value={stringValue(params.chip)} />
        <FilterInput label="Lote" name="lote" value={stringValue(params.lote)} />
        <FilterInput label="Estado" name="estadoActivacion" value={stringValue(params.estadoActivacion)} />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Situacion
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            defaultValue={stringValue(params.activacionCompletada)}
            name="activacionCompletada"
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
          <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/activaciones">
            Limpiar
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          Pagina {pagination.page} de {pagination.totalPages}. {pagination.total} filas.
        </p>
        <div className="flex gap-2">
          <PaginationLink disabled={pagination.page <= 1} href={`/activaciones?${previousParams}`}>
            Anterior
          </PaginationLink>
          <PaginationLink disabled={pagination.page >= pagination.totalPages} href={`/activaciones?${nextParams}`}>
            Siguiente
          </PaginationLink>
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

function PaginationLink({ children, disabled, href }: { children: ReactNode; disabled: boolean; href: string }) {
  if (disabled) {
    return <span className="rounded-md border border-slate-200 px-3 py-2 text-slate-400">{children}</span>
  }

  return (
    <Link className="rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700" href={href}>
      {children}
    </Link>
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

function pageHref(params: Record<string, string | string[] | undefined>, page: number) {
  const next = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    const stringified = stringValue(value)
    if (stringified && key !== 'page') {
      next.set(key, stringified)
    }
  }

  next.set('page', String(page))
  return next.toString()
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}
