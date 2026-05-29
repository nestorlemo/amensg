import Link from 'next/link'

import { ChangeEstadoCobroForm } from '@/components/change-estado-cobro-form'
import { PageHeader } from '@/components/page-header'
import { StatCard, TableTh, TableTd, FilterTextInput } from '@/components/ui/primitives'
import { getCobros } from '@/lib/read-models'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CobrosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, filters, resumen } = await getCobros(params)

  return (
    <div className="space-y-6">
      <PageHeader
        section="Cobros"
        title="Gestión de cobros"
        description="Seguimiento de estados de cobro sobre facturaciones generadas."
      />

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-5" method="get">
        <FilterTextInput label="Anio" name="anio" value={stringValue(params.anio)} placeholder="2026" />
        <FilterTextInput label="Mes" name="mes" value={stringValue(params.mes)} placeholder="4" />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
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
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
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
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 transition-colors" type="submit">
            Filtrar
          </button>
          <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/cobros">
            Limpiar
          </Link>
        </div>
      </form>

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Pendiente sin IVA" value={resumen.totalPendienteSinIva} />
        <StatCard label="Pendiente con IVA" value={resumen.totalPendienteConIva} />
        <StatCard label="Empresas con deuda" value={resumen.empresasConDeuda} />
        <StatCard label="Periodos pendientes" value={resumen.periodosPendientes} />
      </section>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <TableTh>Empresa</TableTh>
              <TableTh>Periodo</TableTh>
              <TableTh>Total sin IVA</TableTh>
              <TableTh>Total con IVA</TableTh>
              <TableTh>Estado</TableTh>
              <TableTh>Fecha cobro</TableTh>
              <TableTh>Acciones</TableTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors" key={row.id}>
                <TableTd>{row.empresa}</TableTd>
                <TableTd>{formatPeriod(row.anio, row.mes)}</TableTd>
                <TableTd>{row.subtotal}</TableTd>
                <TableTd>{row.total}</TableTd>
                <TableTd>{row.estadoCobro}</TableTd>
                <TableTd>{row.fechaCobro ? formatDate(row.fechaCobro) : 'Sin registrar'}</TableTd>
                <TableTd>
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
                </TableTd>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <TableTd colSpan={7}>No hay cobros para los filtros seleccionados.</TableTd>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
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
