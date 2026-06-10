import Link from 'next/link'
import type { ReactNode } from 'react'

import { GastosFijosManager, GastosResumen, GastosVariablesManager, GastoRowActions } from '@/components/gastos-manager'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/index'
import { getGastos } from '@/lib/gastos-ingresos'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function GastosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, conceptos, periodoCerrado } = await getGastos(params)

  const conceptosFijos = conceptos.filter((c) => c.tipo === 'FIJO')
  const conceptosVariables = conceptos.filter((c) => c.tipo === 'VARIABLE')
  const gastosVariables = rows.filter((r) => r.tipo === 'VARIABLE')

  return (
    <div className="space-y-6">
      <PageHeader
        section="Gastos"
        title="Gastos mensuales"
        description="Administrá gastos fijos (automáticos en liquidaciones) y variables del período."
      />

      {/* Resumen */}
      <GastosResumen conceptosFijos={conceptosFijos} gastosVariables={gastosVariables} />

      {/* Sección 1: Gastos fijos */}
      <GastosFijosManager conceptos={conceptos} />

      {/* Sección 2: Gastos variables — filtro + formulario + tabla */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-950">Gastos variables del período</h2>

        <form className="grid gap-3 rounded-md border border-slate-100 bg-slate-50 p-3 md:grid-cols-5" method="get">
          <FilterInput label="Año" name="anio" placeholder="2026" value={stringValue(params.anio)} />
          <FilterInput label="Mes" name="mes" placeholder="6" value={stringValue(params.mes)} />
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Concepto
            <select className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm" defaultValue={stringValue(params.conceptoId)} name="conceptoId">
              <option value="">Todos</option>
              {conceptosVariables.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button variant="secondary" type="submit">Filtrar</Button>
            <Link className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/gastos">Limpiar</Link>
          </div>
        </form>

        {periodoCerrado ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
            Este período está cerrado. Para modificar gastos debe reabrirse el cierre.
          </div>
        ) : null}

        <GastosVariablesManager conceptos={conceptos} disabled={periodoCerrado} />

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <Th>Concepto</Th>
                <Th>Período</Th>
                <Th>Fecha</Th>
                <Th>Importe S/IVA</Th>
                <Th>Observaciones</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gastosVariables.map((row) => (
                <tr key={row.id}>
                  <Td>{row.concepto}</Td>
                  <Td>{formatPeriod(row.anio, row.mes)}</Td>
                  <Td>{formatDate(row.fecha)}</Td>
                  <Td>{row.importe}</Td>
                  <Td>{row.observaciones ?? '—'}</Td>
                  <Td><GastoRowActions conceptos={conceptosVariables} disabled={periodoCerrado} gasto={row} /></Td>
                </tr>
              ))}
              {gastosVariables.length === 0 ? (
                <tr><Td colSpan={6}>No hay gastos variables para los filtros seleccionados.</Td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function FilterInput({ label, name, placeholder, value }: { label: string; name: string; placeholder?: string; value: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm" defaultValue={value} name={name} placeholder={placeholder} />
    </label>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3">{children}</th>
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
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : '—'
}
