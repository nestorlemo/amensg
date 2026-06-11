import { Fragment } from 'react'

import { CerrarLiquidacionButton } from '@/components/cerrar-liquidacion-button'
import {
  EmptyRow, FinancialRow, FilterInput,
  SectionHeader, Td, Th,
} from '@/components/liquidaciones/LiquidacionComponents'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/ui/index'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { buildLiquidacionPreview } from '@/lib/liquidaciones'
import { formatInteger, formatMoney, formatPercent, parseIntParam, sumMoney } from '@/lib/liquidaciones-format'

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

      <section className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total ingresos S/IVA (UYU)" value={formatMoney(preview.ingresos.totalIngresosSinIva)} accent="green" />
        <StatCard label="IVA total (UYU)" value={formatMoney(preview.ingresos.totalIva)} />
        <StatCard label="Total ingresos C/IVA (UYU)" value={formatMoney(preview.ingresos.ingresosConIva)} accent="green" />
        <StatCard label="Total gastos S/IVA (UYU)" value={formatMoney(preview.gastos.totalGastos)} accent="red" />
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Resultado activaciones (UYU)" value={formatMoney(preview.resultado.resultadoActivaciones)} accent="green" />
        <StatCard label="Resultado adicionales (USD)" value={formatMoney(preview.resultado.resultadoAdicionales)} accent="green" />
        <StatCard label="Resultado desarrollo (USD)" value={formatMoney(preview.resultado.resultadoDesarrolloUSD)} accent="purple" />
        <StatCard label="Resultado distribuible (UYU)" value={formatMoney(preview.resultado.resultadoDistribuible)} accent="green" />
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
                <Th align="right">Monto S/IVA</Th>
                <Th align="right">IVA</Th>
                <Th align="right">Monto C/IVA</Th>
              </tr>
            </thead>
            <tbody>
              <FinancialRow
                concept="Facturación"
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
          title="Detalle de facturación"
        />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Empresa</Th>
                <Th align="right">Activaciones</Th>
                <Th align="right">Monto S/IVA</Th>
                <Th align="right">IVA</Th>
                <Th align="right">Monto C/IVA</Th>
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
                <EmptyRow colSpan={5} message="No hay facturación activa para este periodo." />
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
                <Th align="right">Monto S/IVA</Th>
                <Th align="right">IVA</Th>
                <Th align="right">Monto C/IVA</Th>
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
                <Fragment key={f.id}>
                  <tr className="border-t border-slate-200">
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
                      <td className="px-4 py-1.5 text-right tabular-nums">{formatMoney(d.montoUSD)} USD</td>
                      <td colSpan={4} />
                    </tr>
                  ))}
                </Fragment>
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
                <Th align="right">Importe S/IVA</Th>
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
                <Td colSpan={2}>Total gastos S/IVA</Td>
                <Td align="right">{formatMoney(preview.gastos.totalGastos)}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader
          description={`${preview.socios.length} socios activos para distribuir resultado.`}
          title="Distribución por socio"
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
                <Th align="right">Total UYU</Th>
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
