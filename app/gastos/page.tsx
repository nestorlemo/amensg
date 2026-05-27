import Link from 'next/link'
import type { ReactNode } from 'react'

import { ConceptoForm, GastoForm, GastoRowActions } from '@/components/gastos-manager'
import { getGastos } from '@/lib/gastos-ingresos'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function GastosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, conceptos, periodoCerrado, resumen } = await getGastos(params)

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Gastos</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Gastos mensuales</h1>
        <p className="mt-2 text-sm text-slate-600">Alta, edicion y baja de gastos mientras el periodo esta abierto.</p>
      </header>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-5" method="get">
        <FilterInput label="Anio" name="anio" value={stringValue(params.anio)} placeholder="2026" />
        <FilterInput label="Mes" name="mes" value={stringValue(params.mes)} placeholder="5" />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Concepto
          <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={stringValue(params.conceptoId)} name="conceptoId">
            <option value="">Todos</option>
            {conceptos.map((concepto) => (
              <option key={concepto.id} value={concepto.id}>{concepto.nombre}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Tipo
          <select className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={stringValue(params.tipo)} name="tipo">
            <option value="">Todos</option>
            <option value="FIJO">FIJO</option>
            <option value="VARIABLE">VARIABLE</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">Filtrar</button>
          <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/gastos">Limpiar</Link>
        </div>
      </form>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Total gastos del mes" value={resumen.totalGastosMes} />
        <Metric label="Gastos fijos" value={resumen.totalGastosFijos} />
        <Metric label="Gastos variables" value={resumen.totalGastosVariables} />
        <Metric label="Cantidad de gastos" value={resumen.cantidadGastos} />
      </section>

      {periodoCerrado ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
          Este período está cerrado. Para modificar gastos debe reabrirse el cierre.
        </section>
      ) : null}

      <ConceptoForm conceptos={conceptos} />
      <GastoForm conceptos={conceptos} disabled={periodoCerrado} />

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Concepto</Th>
              <Th>Tipo</Th>
              <Th>Periodo</Th>
              <Th>Fecha</Th>
              <Th>Importe</Th>
              <Th>Observaciones</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200" key={row.id}>
                <Td>{row.concepto}</Td>
                <Td>{row.tipo}</Td>
                <Td>{formatPeriod(row.anio, row.mes)}</Td>
                <Td>{formatDate(row.fecha)}</Td>
                <Td>{row.importe}</Td>
                <Td>{row.observaciones ?? 'Sin observaciones'}</Td>
                <Td><GastoRowActions conceptos={conceptos} disabled={periodoCerrado} gasto={row} /></Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><Td colSpan={7}>No hay gastos para los filtros seleccionados.</Td></tr>
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

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}
