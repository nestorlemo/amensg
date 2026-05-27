import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getCierre } from '@/lib/liquidaciones'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CierreDetailPage({ params }: PageProps) {
  const { id } = await params
  const cierre = await getCierre(id)

  if (!cierre) {
    notFound()
  }

  const snapshot = asRecord(cierre.snapshot)
  const ingresos = asRecord(snapshot.ingresos)
  const gastos = asRecord(snapshot.gastos)
  const socios = Array.isArray(snapshot.socios) ? snapshot.socios.map(asRecord) : []

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <Link className="text-sm font-semibold text-slate-600 underline" href="/cierres">
          Volver a cierres
        </Link>
        <p className="mt-4 text-sm font-medium uppercase text-slate-500">Cierre mensual</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{formatPeriod(cierre.anio, cierre.mes)}</h1>
        <p className="mt-2 text-sm text-slate-600">Snapshot cerrado el {formatDate(cierre.cerradoAt)}.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Estado" value={cierre.estado} />
        <Metric label="Total activaciones" value={cierre.totalActivaciones} />
        <Metric label="Empresas" value={displayValue(snapshot.totalEmpresas, '0')} />
        <Metric label="Tipo cambio USD" value={displayValue(snapshot.tipoCambioUsd, 'Sin dato')} />
        <Metric label="Ingresos sin IVA" value={displayValue(snapshot.totalIngresosSinIva, '0.00')} />
        <Metric label="IVA total" value={displayValue(snapshot.totalIva, '0.00')} />
        <Metric label="Ingresos con IVA" value={displayValue(snapshot.totalIngresosConIva, '0.00')} />
        <Metric label="Total gastos" value={displayValue(snapshot.totalGastos, '0.00')} />
        <Metric label="Resultado distribuible" value={displayValue(snapshot.resultadoDistribuible, '0.00')} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SnapshotPanel title="Ingresos" value={ingresos} />
        <SnapshotPanel title="Gastos" value={gastos} />
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-950">Distribucion por socio</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Socio</Th>
                <Th>Porcentaje</Th>
                <Th>Monto pesos</Th>
                <Th>Monto USD</Th>
                <Th>Cuentas</Th>
              </tr>
            </thead>
            <tbody>
              {socios.map((socio) => (
                <tr className="border-t border-slate-200" key={String(socio.socioId)}>
                  <Td>{String(socio.socioNombre ?? '')}</Td>
                  <Td>{formatPercent(String(socio.socioPorcentaje ?? '0'))}</Td>
                  <Td>{String(socio.montoPesos ?? '0.00')}</Td>
                  <Td>{String(socio.montoUsd ?? '0.00')}</Td>
                  <Td>{socio.socioCuentas ? JSON.stringify(socio.socioCuentas) : 'Sin cuentas'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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

function SnapshotPanel({ title, value }: { title: string; value: Record<string, unknown> }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-white">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="whitespace-nowrap px-4 py-3 text-slate-700">{children}</td>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function displayValue(value: unknown, fallback: string) {
  return typeof value === 'string' || typeof value === 'number' ? value : fallback
}

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}

function formatPercent(value: string) {
  return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(Number(value) * 100)}%`
}
