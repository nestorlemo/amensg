import Link from 'next/link'

const reportGroups = [
  {
    title: 'Operacion',
    reports: [
      {
        href: '/reportes/mensual-empresa',
        title: 'Mensual por empresa',
        description: 'Resumen de actividad mensual por empresa con activaciones, facturacion e ingresos adicionales.',
        filters: 'Anio, mes, empresa',
      },
      {
        href: '/reportes/activaciones',
        title: 'Activaciones',
        description: 'Preview de activaciones importadas con conteo total y primeras 100 filas.',
        filters: 'Anio, mes, empresa',
      },
      {
        href: '/reportes/facturacion',
        title: 'Facturacion',
        description: 'Facturacion por empresa, montos con IVA y estado de cobro.',
        filters: 'Anio, mes, empresa, estado',
      },
    ],
  },
  {
    title: 'Cobranza',
    reports: [
      {
        href: '/reportes/cobros-pendientes',
        title: 'Cobros pendientes',
        description: 'Facturaciones pendientes o enviadas para seguimiento de cobranza.',
        filters: 'Anio, mes, empresa',
      },
    ],
  },
  {
    title: 'Administracion',
    reports: [
      {
        href: '/reportes/gastos',
        title: 'Gastos',
        description: 'Detalle y totalizacion de gastos mensuales registrados.',
        filters: 'Anio, mes',
      },
      {
        href: '/reportes/ingresos-adicionales',
        title: 'Ingresos adicionales',
        description: 'Detalle de ingresos adicionales con totales en UYU.',
        filters: 'Anio, mes, empresa',
      },
    ],
  },
  {
    title: 'Cierre',
    reports: [
      {
        href: '/reportes/liquidacion',
        title: 'Liquidacion / cierre',
        description: 'Preview de liquidacion para periodos abiertos o snapshot congelado si el periodo esta cerrado.',
        filters: 'Anio, mes',
      },
    ],
  },
]

export default function ReportesPage() {
  return (
    <div className="min-w-0 max-w-full space-y-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Reportes</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Centro de reportes</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Seleccione un reporte para revisar una vista previa filtrada antes de exportar el CSV.
        </p>
      </header>

      {reportGroups.map((group) => (
        <section className="space-y-3" key={group.title}>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{group.title}</h2>
            <div className="mt-1 h-px bg-slate-200" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.reports.map((report) => (
              <Link
                className="flex min-h-56 flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                href={report.href}
                key={report.href}
              >
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-slate-950">{report.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{report.description}</p>
                  <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Filtros disponibles:</span> {report.filters}
                  </div>
                </div>
                <span className="mt-6 inline-flex text-sm font-semibold text-slate-950">Abrir reporte →</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
