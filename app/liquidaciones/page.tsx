import type { ReactNode } from 'react'

import { CerrarLiquidacionButton } from '@/components/cerrar-liquidacion-button'
import { PageHeader } from '@/components/page-header'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { buildLiquidacionPreview } from '@/lib/liquidaciones'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LiquidacionesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const anio = parseIntParam(params.anio) ?? new Date().getFullYear()
  const mes = parseIntParam(params.mes) ?? new Date().getMonth() + 1
  const user = await getCurrentUser()
  const preview = await buildLiquidacionPreview({ anio, mes })
  const facturacionIva = sumMoney(preview.ingresos.facturaciones.map((row) => row.iva))
  const facturacionConIva = sumMoney(preview.ingresos.facturaciones.map((row) => row.totalConIva))
  const ingresosAdicionalesIva = sumMoney(preview.ingresos.adicionales.map((row) => row.iva))
  const ingresosAdicionalesConIva = sumMoney(preview.ingresos.adicionales.map((row) => row.montoConIva))

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <PageHeader
        section="Liquidaciones"
        title="Liquidación mensual"
        description="Liquidación basada en facturado, no en cobrado."
      />

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-3" method="get">
        <FilterInput label="Anio" name="anio" value={String(anio)} />
        <FilterInput label="Mes" name="mes" value={String(mes)} />
        <div className="flex items-end">
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Ver preview
          </button>
        </div>
      </form>

      {preview.validaciones.length > 0 ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-950">Validaciones</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
            {preview.validaciones.map((validacion) => (
              <li key={validacion.codigo}>{validacion.mensaje}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {preview.avisos.length > 0 ? (
        <section className="rounded-md border border-sky-200 bg-sky-50 p-4">
          <h2 className="text-sm font-semibold text-sky-950">Avisos</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-sky-900">
            {preview.avisos.map((aviso) => (
              <li key={aviso.codigo}>{aviso.mensaje}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Total ingresos sin IVA" value={preview.ingresos.totalIngresosSinIva} />
        <Metric label="IVA total" value={preview.ingresos.totalIva} />
        <Metric label="Total ingresos con IVA" value={preview.ingresos.ingresosConIva} />
        <Metric label="Total gastos" value={preview.gastos.totalGastos} />
        <Metric label="Resultado distribuible" value={preview.resultado.resultadoDistribuible} />
        <Metric label="Tipo cambio USD" value={preview.resultado.tipoCambioUsd ?? 'Sin configurar'} />
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-3">
        <Metric label="Resultado activaciones" value={preview.resultado.resultadoActivaciones} />
        <Metric label="Resultado adicionales" value={preview.resultado.resultadoAdicionales} />
        <Metric label="Resultado desarrollo" value={preview.resultado.resultadoDesarrollo} />
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Ingresos</h2>
            <p className="text-sm text-slate-600">Resumen del ingreso facturado y adicional para el periodo.</p>
          </div>
          {preview.puedeCerrar && isAdmin(user) ? <CerrarLiquidacionButton anio={anio} mes={mes} /> : null}
        </div>
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
                concept="Facturacion"
                iva={facturacionIva}
                total={facturacionConIva}
                withoutIva={preview.ingresos.facturacionSinIva}
              />
              <FinancialRow
                concept="Ingresos adicionales"
                iva={ingresosAdicionalesIva}
                total={ingresosAdicionalesConIva}
                withoutIva={preview.ingresos.ingresosAdicionalesSinIva}
              />
              <FinancialRow
                concept="Total ingresos"
                emphasis
                iva={preview.ingresos.totalIva}
                total={preview.ingresos.ingresosConIva}
                withoutIva={preview.ingresos.totalIngresosSinIva}
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader
          description={`${preview.resultado.totalEmpresas} empresas y ${preview.resultado.totalActivaciones} activaciones facturables.`}
          title="Detalle de facturacion"
        />
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
              {preview.ingresos.facturaciones.map((row) => (
                <tr className="border-t border-slate-200" key={row.id}>
                  <Td>{row.empresa}</Td>
                  <Td align="right">{formatInteger(row.cantidadActivaciones)}</Td>
                  <Td align="right">{formatMoney(row.totalSinIva)}</Td>
                  <Td align="right">{formatMoney(row.iva)}</Td>
                  <Td align="right">{formatMoney(row.totalConIva)}</Td>
                </tr>
              ))}
              {preview.ingresos.facturaciones.length === 0 ? (
                <EmptyRow colSpan={5} message="No hay facturacion activa para este periodo." />
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader
          description="Ingresos cargados manualmente para sumar al resultado mensual."
          title="Ingresos adicionales"
        />
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
              {preview.ingresos.adicionales.map((row) => (
                <tr className="border-t border-slate-200" key={row.id}>
                  <Td>{row.concepto}</Td>
                  <Td>{row.empresa ?? 'General'}</Td>
                  <Td align="right">{formatMoney(row.montoSinIva)}</Td>
                  <Td align="right">{formatMoney(row.iva)}</Td>
                  <Td align="right">{formatMoney(row.montoConIva)}</Td>
                </tr>
              ))}
              {preview.ingresos.adicionales.length === 0 ? (
                <EmptyRow colSpan={5} message="No hay ingresos adicionales para este periodo." />
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader title="Facturación de desarrollo" description="Facturas de desarrollo del período." />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Empresa</Th>
                <Th align="right">Horas</Th>
                <Th align="right">Total USD s/IVA</Th>
                <Th align="right">IVA USD</Th>
                <Th align="right">Total c/IVA USD</Th>
                <Th align="right">Tipo cambio</Th>
                <Th align="right">Total c/IVA UYU</Th>
              </tr>
            </thead>
            <tbody>
              {preview.ingresos.desarrolloFacturas.length === 0 ? (
                <EmptyRow colSpan={7} message="No hay facturas de desarrollo para este periodo." />
              ) : null}
              {preview.ingresos.desarrolloFacturas.map((f) => (
                <>
                  <tr className="border-t border-slate-200" key={f.id}>
                    <Td>{f.empresa}</Td>
                    <Td align="right">{f.totalHoras}</Td>
                    <Td align="right">{formatMoney(f.totalUSD)}</Td>
                    <Td align="right">{formatMoney(f.ivaUSD)}</Td>
                    <Td align="right">{formatMoney(f.totalConIvaUSD)}</Td>
                    <Td align="right">{formatMoney(f.tipoCambio)}</Td>
                    <Td align="right">{formatMoney(f.totalConIvaUYU)}</Td>
                  </tr>
                  {f.distribuciones.map((d) => (
                    <tr key={d.id} className="bg-slate-50 text-xs text-slate-500">
                      <td className="px-4 py-1.5 pl-8 italic" colSpan={2}>{d.socioNombre} · {d.porcentaje}%</td>
                      <td className="px-4 py-1.5 text-right tabular-nums" colSpan={3}>{formatMoney(d.montoUSD)} USD</td>
                      <td className="px-4 py-1.5 text-right tabular-nums" colSpan={2}>{formatMoney(d.montoUYU)} UYU</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader description="Gastos que reducen el resultado distribuible." title="Gastos" />
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
              {preview.gastos.detalle.map((row) => (
                <tr className="border-t border-slate-200" key={row.id}>
                  <Td>{row.concepto}</Td>
                  <Td>{row.tipo}</Td>
                  <Td align="right">{formatMoney(row.importe)}</Td>
                </tr>
              ))}
              {preview.gastos.detalle.length === 0 ? (
                <EmptyRow colSpan={3} message="No hay gastos cargados para este periodo." />
              ) : null}
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-950">
                <Td colSpan={2}>Total gastos</Td>
                <Td align="right">{formatMoney(preview.gastos.totalGastos)}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader
          description={`${preview.socios.length} socios activos para distribuir resultado.`}
          title="Distribucion por socio"
        />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Socio</Th>
                <Th align="right">Porcentaje</Th>
                <Th align="right">Activaciones</Th>
                <Th align="right">Adicionales</Th>
                <Th align="right">Desarrollo</Th>
                <Th align="right">Total pesos</Th>
                <Th align="right">Total USD</Th>
              </tr>
            </thead>
            <tbody>
              {preview.socios.map((socio) => (
                <tr className="border-t border-slate-200" key={socio.id}>
                  <Td>{socio.nombre}</Td>
                  <Td align="right">{formatPercent(socio.porcentaje)}</Td>
                  <Td align="right">{formatMoney(socio.montoActivaciones)}</Td>
                  <Td align="right">{formatMoney(socio.montoAdicionales)}</Td>
                  <Td align="right">{formatMoney(socio.montoDesarrollo)}</Td>
                  <Td align="right">{formatMoney(socio.montoPesos)}</Td>
                  <Td align="right">{socio.montoUsd ? formatMoney(socio.montoUsd) : 'Sin configurar'}</Td>
                </tr>
              ))}
              {preview.socios.length === 0 ? <EmptyRow colSpan={7} message="No hay socios activos configurados." /> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  const renderedValue = typeof value === 'number' ? String(value) : formatMoney(value)
  const isNumericValue = typeof value === 'number' || isFiniteMoney(value)

  return (
    <div className="flex h-full min-h-32 flex-col justify-between rounded-md border border-slate-200 bg-white p-4">
      <p className="min-h-10 text-xs font-semibold uppercase leading-5 text-slate-500">{label}</p>
      <p
        className={`mt-3 min-h-14 break-words font-semibold leading-tight text-slate-950 ${
          isNumericValue ? 'text-2xl tabular-nums' : 'text-xl'
        }`}
      >
        {renderedValue}
      </p>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="text-sm text-slate-600">{description}</p>
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

function FilterInput({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={value} name={name} />
    </label>
  )
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>
}

function Td({ children, colSpan, align = 'left' }: { children: ReactNode; colSpan?: number; align?: 'left' | 'right' }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-slate-700 ${align === 'right' ? 'text-right tabular-nums' : ''}`} colSpan={colSpan}>
      {children}
    </td>
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

function parseIntParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : null
}

function formatPercent(value: string) {
  return `${new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 }).format(Number(value) * 100)}%`
}

function formatMoney(value: string) {
  if (value === 'No configurado') {
    return value
  }

  if (value === 'Sin configurar') {
    return value
  }

  return new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function isFiniteMoney(value: string) {
  return Number.isFinite(Number(value))
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 }).format(value)
}

function sumMoney(values: string[]) {
  return values.reduce((total, value) => total + Number(value), 0).toFixed(2)
}
