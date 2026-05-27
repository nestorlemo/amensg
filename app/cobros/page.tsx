import Link from 'next/link'
import type { ReactNode } from 'react'

import { ChangeEstadoCobroForm } from '@/components/change-estado-cobro-form'
import { getCobros } from '@/lib/read-models'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CobrosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, filters, resumen } = await getCobros(params)

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Cobros</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Gestion de cobros</h1>
        <p className="mt-2 text-sm text-slate-600">Seguimiento de estados de cobro sobre facturaciones generadas.</p>
      </header>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-5" method="get">
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
            {filters.empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Estado
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            defaultValue={stringValue(params.estado)}
            name="estado"
          >
            <option value="">Todos</option>
            {filters.estadosCobro.map((estado) => (
              <option key={estado.codigo} value={estado.codigo}>
                {estado.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Filtrar
          </button>
          <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/cobros">
            Limpiar
          </Link>
        </div>
      </form>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Pendiente sin IVA" value={resumen.totalPendienteSinIva} />
        <Metric label="Pendiente con IVA" value={resumen.totalPendienteConIva} />
        <Metric label="Empresas con deuda" value={resumen.empresasConDeuda} />
        <Metric label="Periodos pendientes" value={resumen.periodosPendientes} />
      </section>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Empresa</Th>
              <Th>Periodo</Th>
              <Th>Total sin IVA</Th>
              <Th>Total con IVA</Th>
              <Th>Estado</Th>
              <Th>Fecha cobro</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200" key={row.id}>
                <Td>{row.empresa}</Td>
                <Td>{formatPeriod(row.anio, row.mes)}</Td>
                <Td>{row.subtotal}</Td>
                <Td>{row.total}</Td>
                <Td>{row.estadoCobro}</Td>
                <Td>{row.fechaCobro ? formatDate(row.fechaCobro) : 'Sin registrar'}</Td>
                <Td>
                  <div className="flex flex-col gap-3">
                    <ChangeEstadoCobroForm
                      estadoCobroId={row.estadoCobroId}
                      estadosCobro={filters.estadosCobro}
                      facturacionId={row.id}
                      fechaCobro={row.fechaCobro}
                      observaciones={row.observaciones}
                    />
                    <Link
                      className="font-semibold text-slate-950 underline"
                      href={`/activaciones?importacionId=${row.importacionId}&empresaId=${row.empresaId}`}
                    >
                      Ver activaciones
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={7}>No hay cobros para los filtros seleccionados.</Td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
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
