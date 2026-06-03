import Link from 'next/link'
import type { ReactNode } from 'react'

import { IngresoAdicionalForm, IngresoRowActions } from '@/components/ingresos-adicionales-manager'
import { PageHeader } from '@/components/page-header'
import { getIngresosAdicionales } from '@/lib/gastos-ingresos'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function IngresosAdicionalesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, empresas, periodoCerrado } = await getIngresosAdicionales(params)

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        section="Ingresos adicionales"
        title="Ingresos adicionales"
        description="Ingresos no provenientes de activaciones, con IVA calculado."
      />

      <form className="grid min-w-0 gap-3 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" method="get">
        <FilterInput label="Anio" name="anio" value={stringValue(params.anio)} placeholder="2026" />
        <FilterInput label="Mes" name="mes" value={stringValue(params.mes)} placeholder="5" />
        <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm" defaultValue={stringValue(params.empresaId)} name="empresaId">
            <option value="">Todas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
            ))}
          </select>
        </label>
        <div className="flex min-w-0 items-end gap-2">
          <button className="h-10 min-w-0 flex-1 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white sm:flex-none" type="submit">Filtrar</button>
          <Link className="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium text-slate-600 sm:flex-none" href="/ingresos-adicionales">Limpiar</Link>
        </div>
      </form>

      {periodoCerrado ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
          Este período está cerrado. Para modificar ingresos adicionales debe reabrirse el cierre.
        </section>
      ) : null}

      <IngresoAdicionalForm disabled={periodoCerrado} empresas={empresas} />

      <div className="max-w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Concepto</Th>
              <Th>Empresa</Th>
              <Th>Periodo</Th>
              <Th>Fecha facturacion</Th>
              <Th>Moneda</Th>
              <Th>Monto sin IVA</Th>
              <Th>Monto con IVA</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200" key={row.id}>
                <Td>{row.concepto}</Td>
                <Td>{row.empresa ?? 'Sin empresa'}</Td>
                <Td>{formatPeriod(row.anio, row.mes)}</Td>
                <Td>{formatDate(row.fechaFacturacion)}</Td>
                <Td>{row.moneda}</Td>
                <Td>{row.montoSinIva}</Td>
                <Td>{row.montoConIva}</Td>
                <Td><IngresoRowActions disabled={periodoCerrado} ingreso={row} /></Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><Td colSpan={8}>No hay ingresos adicionales para los filtros seleccionados.</Td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterInput({ label, name, placeholder, value }: { label: string; name: string; placeholder?: string; value: string }) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm" defaultValue={value} name={name} placeholder={placeholder} />
    </label>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return <td className="whitespace-nowrap px-4 py-3 text-slate-700" colSpan={colSpan}>{children}</td>
}

function stringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function formatDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : 'Sin fecha'
}
