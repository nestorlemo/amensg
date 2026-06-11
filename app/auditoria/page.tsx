import type { ReactNode } from 'react'
import { Eye } from 'lucide-react'

import { AccessDenied } from '@/components/access-denied'
import { DateInput } from '@/components/date-input'
import { PageHeader } from '@/components/page-header'
import { requireAdminPage } from '@/lib/auth'
import { getAuditoria } from '@/lib/auditoria'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const user = await requireAdminPage()
  if (!user) return <AccessDenied />

  const params = (await searchParams) ?? {}
  const { rows } = await getAuditoria(params)

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        section="Administración"
        title="Trazabilidad operativa"
        description="Consulta de acciones relevantes del sistema. Los registros son históricos y no se editan desde esta pantalla."
      />

      <form className="grid min-w-0 gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-6" method="get">
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Fecha desde
          <DateInput className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm" name="fechaDesde" defaultValue={stringValue(params.fechaDesde)} />
        </label>
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Fecha hasta
          <DateInput className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm" name="fechaHasta" defaultValue={stringValue(params.fechaHasta)} />
        </label>
        <FilterInput label="Entidad" name="entidad" placeholder="Parametro" value={stringValue(params.entidad)} />
        <FilterInput label="Accion" name="accion" placeholder="ACTUALIZAR" value={stringValue(params.accion)} />
        <FilterInput label="Usuario" name="usuario" placeholder="Sistema" value={stringValue(params.usuario)} />
        <FilterInput label="Buscar" name="q" placeholder="motivo, ID, texto" value={stringValue(params.q)} />
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Limite
          <input
            className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm"
            defaultValue={stringValue(params.limit) || '100'}
            max={500}
            min={1}
            name="limit"
            type="number"
          />
        </label>
        <div className="flex min-w-0 items-end gap-2 xl:col-span-5">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Filtrar
          </button>
          <a className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/auditoria">
            Limpiar
          </a>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-[980px] text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Fecha/hora</Th>
              <Th>Usuario</Th>
              <Th>Accion</Th>
              <Th>Entidad</Th>
              <Th>Resumen</Th>
              <Th>Detalle / Ver</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200 align-top" key={row.id}>
                <Td>{formatDateTime(row.fechaHora)}</Td>
                <Td>{row.usuario}</Td>
                <Td>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{row.accion}</span>
                </Td>
                <Td>
                  <div className="font-medium text-slate-800">{row.entidad}</div>
                  <div className="mt-1 max-w-48 truncate text-xs text-slate-500" title={row.entidadId}>
                    {row.entidadId}
                  </div>
                </Td>
                <Td>{row.resumen}</Td>
                <Td>
                  <details className="group">
                    <summary className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <Eye size={12} />
                      Ver detalle
                    </summary>
                    <dl className="mt-3 grid max-w-xl gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <Detail label="Accion" value={row.accion} />
                      <Detail label="Entidad" value={row.entidad} />
                      <Detail label="Entidad ID" value={row.entidadId} />
                      <Detail label="Usuario" value={row.usuario} />
                      <Detail label="Timestamp" value={formatDateTime(row.fechaHora)} />
                      {row.detalle.map((item) => (
                        <Detail key={`${row.id}-${item.label}`} label={readableLabel(item.label)} value={item.value} />
                      ))}
                    </dl>
                  </details>
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={6}>No hay registros de auditoria para los filtros seleccionados.</Td>
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
  type = 'text',
}: {
  label: string
  name: string
  value: string
  placeholder?: string
  type?: string
}) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td className="px-4 py-3 text-slate-700" colSpan={colSpan}>
      {children}
    </td>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[180px_1fr]">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="break-words text-sm text-slate-800">{value}</dd>
    </div>
  )
}

function stringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function readableLabel(value: string) {
  return value.replace(/\./g, ' / ').replace(/([a-z])([A-Z])/g, '$1 $2')
}
