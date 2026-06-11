import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/ui/index'
import { ReabrirCierreForm } from '@/components/reabrir-cierre-form'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getCierre } from '@/lib/liquidaciones'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CierreDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  const cierre = await getCierre(id)

  if (!cierre) {
    notFound()
  }

  const snapshot = asRecord(cierre.snapshot)
  const ingresos = asRecord(snapshot.ingresos)
  const gastos = asRecord(snapshot.gastos)
  const socios = Array.isArray(snapshot.socios) ? snapshot.socios.map(asRecord) : []
  const facturaciones = arrayRecords(ingresos.facturaciones)
  const adicionales = arrayRecords(ingresos.adicionales)
  const gastosDetalle = arrayRecords(gastos.detalle)
  const facturacionIva = sumMoney(facturaciones.map((row) => stringValue(row.iva, '0.00')))
  const facturacionConIva = sumMoney(facturaciones.map((row) => stringValue(row.totalConIva, '0.00')))
  const adicionalesIva = sumMoney(adicionales.map((row) => stringValue(row.iva, '0.00')))
  const adicionalesConIva = sumMoney(adicionales.map((row) => stringValue(row.montoConIva, '0.00')))

  return (
    <div className="space-y-6">
      <Link className="mb-2 inline-flex text-sm font-semibold text-slate-600 hover:text-slate-950" href="/cierres">
        ← Volver a cierres
      </Link>
      <PageHeader
        section="Cierre mensual"
        title={formatPeriod(cierre.anio, cierre.mes)}
        description={`Snapshot cerrado el ${formatDate(cierre.cerradoAt)}.`}
        action={isAdmin(user) && isCerrado(cierre.estado)
          ? <ReabrirCierreForm buttonLabel="Reabrir cierre" cierreId={cierre.id} />
          : undefined
        }
      />
      {isReabierto(cierre.estado) ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Este cierre fue reabierto.</p>
          <p className="mt-1">Fecha de reapertura: {formatDate(cierre.reabiertoAt)}</p>
          <p className="mt-1">Motivo: {cierre.motivoReapertura ?? 'Sin motivo registrado'}</p>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Estado" value={String(displayValue(cierre.estado, ''))} />
        <StatCard label="Total activaciones" value={cierre.totalActivaciones} />
        <StatCard label="Empresas" value={String(displayValue(snapshot.totalEmpresas, '0'))} />
        <StatCard label="Tipo cambio USD" value={String(displayValue(snapshot.tipoCambioUsd, 'Sin dato'))} />
        <StatCard label="Ingresos sin IVA" value={String(displayValue(snapshot.totalIngresosSinIva, '0.00'))} accent="green" />
        <StatCard label="IVA total" value={String(displayValue(snapshot.totalIva, '0.00'))} />
        <StatCard label="Ingresos con IVA" value={String(displayValue(snapshot.totalIngresosConIva, '0.00'))} accent="green" />
        <StatCard label="Total gastos" value={String(displayValue(snapshot.totalGastos, '0.00'))} accent="red" />
        <StatCard label="Resultado distribuible" value={String(displayValue(snapshot.resultadoDistribuible, '0.00'))} accent="green" />
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-950">Ingresos</h2>
        <p className="text-sm text-slate-600">Valores congelados en el cierre mensual.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Concepto</Th>
                <Th align="right">Sin IVA</Th>
                <Th align="right">IVA</Th>
                <Th align="right">Con IVA</Th>
              </tr>
            </thead>
            <tbody>
              <FinancialRow
                concept="Facturación"
                iva={facturacionIva}
                total={facturacionConIva}
                withoutIva={stringValue(ingresos.facturacionSinIva, '0.00')}
              />
              <FinancialRow
                concept="Ingresos adicionales"
                iva={adicionalesIva}
                total={adicionalesConIva}
                withoutIva={stringValue(ingresos.ingresosAdicionalesSinIva, '0.00')}
              />
              <FinancialRow
                concept="Total ingresos"
                emphasis
                iva={stringValue(ingresos.totalIva, '0.00')}
                total={stringValue(ingresos.ingresosConIva, '0.00')}
                withoutIva={stringValue(ingresos.totalIngresosSinIva, '0.00')}
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-950">Detalle de facturación</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Empresa</Th>
                <Th align="right">Activaciones</Th>
                <Th align="right">Sin IVA</Th>
                <Th align="right">IVA</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {facturaciones.map((row, index) => (
                <tr className="border-t border-slate-200" key={`${stringValue(row.empresa, 'empresa')}-${index}`}>
                  <Td>{stringValue(row.empresa, 'Sin empresa')}</Td>
                  <Td align="right">{numberValue(row.cantidadActivaciones)}</Td>
                  <Td align="right">{formatMoney(stringValue(row.totalSinIva, '0.00'))}</Td>
                  <Td align="right">{formatMoney(stringValue(row.iva, '0.00'))}</Td>
                  <Td align="right">{formatMoney(stringValue(row.totalConIva, '0.00'))}</Td>
                </tr>
              ))}
              {facturaciones.length === 0 ? <EmptyRow colSpan={5} message="No hay facturación en el snapshot." /> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-950">Ingresos adicionales</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Concepto</Th>
                <Th>Empresa</Th>
                <Th align="right">Sin IVA</Th>
                <Th align="right">IVA</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {adicionales.map((row, index) => (
                <tr className="border-t border-slate-200" key={`${stringValue(row.concepto, 'ingreso')}-${index}`}>
                  <Td>{stringValue(row.concepto, 'Sin concepto')}</Td>
                  <Td>{stringValue(row.empresa, 'General')}</Td>
                  <Td align="right">{formatMoney(stringValue(row.montoSinIva, '0.00'))}</Td>
                  <Td align="right">{formatMoney(stringValue(row.iva, '0.00'))}</Td>
                  <Td align="right">{formatMoney(stringValue(row.montoConIva, '0.00'))}</Td>
                </tr>
              ))}
              {adicionales.length === 0 ? <EmptyRow colSpan={5} message="No hay ingresos adicionales en el snapshot." /> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-950">Gastos</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Concepto</Th>
                <Th>Tipo</Th>
                <Th align="right">Importe</Th>
              </tr>
            </thead>
            <tbody>
              {gastosDetalle.map((row, index) => (
                <tr className="border-t border-slate-200" key={`${stringValue(row.concepto, 'gasto')}-${index}`}>
                  <Td>{stringValue(row.concepto, 'Sin concepto')}</Td>
                  <Td>{stringValue(row.tipo, 'Sin tipo')}</Td>
                  <Td align="right">{formatMoney(stringValue(row.importe, '0.00'))}</Td>
                </tr>
              ))}
              {gastosDetalle.length === 0 ? <EmptyRow colSpan={3} message="No hay gastos en el snapshot." /> : null}
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-950">
                <Td colSpan={2}>Total gastos</Td>
                <Td align="right">{formatMoney(stringValue(gastos.totalGastos, '0.00'))}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-950">Distribución por socio</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Socio</Th>
                <Th>Porcentaje</Th>
                <Th>Monto pesos</Th>
                <Th>Monto USD</Th>
              </tr>
            </thead>
            <tbody>
              {socios.map((socio) => (
                <tr className="border-t border-slate-200" key={String(socio.socioId)}>
                  <Td>{String(socio.socioNombre ?? '')}</Td>
                  <Td>{formatPercent(String(socio.socioPorcentaje ?? '0'))}</Td>
                  <Td align="right">{formatMoney(String(socio.montoPesos ?? '0.00'))}</Td>
                  <Td align="right">{formatMoney(String(socio.montoUsd ?? '0.00'))}</Td>
                </tr>
              ))}
              {socios.length === 0 ? <EmptyRow colSpan={4} message="No hay socios en el snapshot." /> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function FinancialRow({
  concept,
  withoutIva,
  iva,
  total,
  emphasis = false,
}: {
  concept: string
  withoutIva: string
  iva: string
  total: string
  emphasis?: boolean
}) {
  return (
    <tr className={`border-t border-slate-200 ${emphasis ? 'bg-slate-50 font-semibold text-slate-950' : ''}`}>
      <Td>{concept}</Td>
      <Td align="right">{formatMoney(withoutIva)}</Td>
      <Td align="right">{formatMoney(iva)}</Td>
      <Td align="right">{formatMoney(total)}</Td>
    </tr>
  )
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  )
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>
}

function Td({ children, align = 'left', colSpan }: { children: ReactNode; align?: 'left' | 'right'; colSpan?: number }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-slate-700 ${align === 'right' ? 'text-right tabular-nums' : ''}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function arrayRecords(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function displayValue(value: unknown, fallback: string) {
  return typeof value === 'string' || typeof value === 'number' ? value : fallback
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(stringValue(value, '0'))
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

function isReabierto(estado: string) {
  return estado.trim().toUpperCase() === 'REABIERTO'
}

function formatPercent(value: string) {
  return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(Number(value) * 100)}%`
}

function formatMoney(value: string) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return value
  }

  return new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)
}

function sumMoney(values: string[]) {
  return values.reduce((total, value) => total + Number(value), 0).toFixed(2)
}
