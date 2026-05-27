import Link from 'next/link'
import type { ReactNode } from 'react'

import { IngresoAdicionalForm, IngresoRowActions } from '@/components/ingresos-adicionales-manager'
import { getIngresosAdicionales } from '@/lib/gastos-ingresos'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function IngresosAdicionalesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, empresas } = await getIngresosAdicionales(params)

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Ingresos adicionales</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Ingresos adicionales</h1>
        <p className="mt-2 text-sm text-slate-600">Ingresos no provenientes de activaciones, con IVA calculado.</p>
      </header>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-4" method="get">
        <FilterInput label="Anio" name="anio" value={stringValue(params.anio)} placeholder="2026" />
        <FilterInput label="Mes" name="mes" value={stringValue(params.mes)} placeholder="5" />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={stringValue(params.empresaId)} name="empresaId">
            <option value="">Todas</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">Filtrar</button>
          <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/ingresos-adicionales">Limpiar</Link>
        </div>
      </form>

      <IngresoAdicionalForm empresas={empresas} />

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Concepto</Th>
              <Th>Empresa</Th>
              <Th>Periodo</Th>
              <Th>Monto sin IVA</Th>
              <Th>IVA %</Th>
              <Th>IVA</Th>
              <Th>Monto con IVA</Th>
              <Th>Observaciones</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200" key={row.id}>
                <Td>{row.concepto}</Td>
                <Td>{row.empresa ?? 'Sin empresa'}</Td>
                <Td>{formatPeriod(row.anio, row.mes)}</Td>
                <Td>{row.montoSinIva}</Td>
                <Td>{row.porcentajeIva}</Td>
                <Td>{row.iva}</Td>
                <Td>{row.montoConIva}</Td>
                <Td>{row.observaciones ?? 'Sin observaciones'}</Td>
                <Td><IngresoRowActions empresas={empresas} ingreso={row} /></Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><Td colSpan={9}>No hay ingresos adicionales para los filtros seleccionados.</Td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterInput({ label, name, placeholder, value }: { label: string; name: string; placeholder?: string; value: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={value} name={name} placeholder={placeholder} />
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
