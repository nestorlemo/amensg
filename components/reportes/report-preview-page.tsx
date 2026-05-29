import Link from 'next/link'

import type { ReportPreview } from '@/lib/reportes'
import { StatCard, TableTh, TableTd, FilterTextInput } from '@/components/ui/primitives'

export function ReportPreviewPage({ preview }: { preview: ReportPreview }) {
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <Link className="text-sm font-semibold text-slate-600 hover:text-slate-950" href="/reportes">
          ← Centro de reportes
        </Link>
        <p className="mt-4 text-sm font-medium uppercase text-slate-500">Reportes</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950">{preview.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{preview.description}</p>
          </div>
          <a
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            href={preview.exportPath}
          >
            Exportar CSV
          </a>
        </div>
      </header>

      <ReportFilters preview={preview} />

      {preview.metrics.length > 0 ? (
        <section className="grid gap-3 md:grid-cols-4">
          {preview.metrics.map((metric) => (
            <StatCard key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </section>
      ) : null}

      {preview.note ? <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{preview.note}</p> : null}

      <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              {preview.columns.map((column) => (
                <TableTh key={column}>{column}</TableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIndex) => (
              <tr className="border-t border-slate-200 hover:bg-slate-50 transition-colors" key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableTd key={`${rowIndex}-${cellIndex}`}>{cell ?? ''}</TableTd>
                ))}
              </tr>
            ))}
            {preview.rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={preview.columns.length}>
                  No hay datos para los filtros seleccionados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function ReportFilters({ preview }: { preview: ReportPreview }) {
  return (
    <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-5" method="get">
      {preview.enabledFilters.includes('anio') ? <FilterTextInput label="Anio" name="anio" placeholder="2026" value={preview.filters.anio ?? ''} /> : null}
      {preview.enabledFilters.includes('mes') ? <FilterTextInput label="Mes" name="mes" placeholder="4" value={preview.filters.mes ?? ''} /> : null}
      {preview.enabledFilters.includes('empresaId') ? (
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
            defaultValue={preview.filters.empresaId ?? ''}
            name="empresaId"
          >
            <option value="">Todas</option>
            {preview.filterOptions.empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {preview.enabledFilters.includes('estado') ? (
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Estado cobro
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
            defaultValue={preview.filters.estado ?? ''}
            name="estado"
          >
            <option value="">Todos</option>
            {preview.filterOptions.estadosCobro.map((estado) => (
              <option key={estado.codigo} value={estado.codigo}>
                {estado.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex items-end gap-2">
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 transition-colors" type="submit">
          Filtrar
        </button>
        <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/reportes">
          Volver
        </Link>
      </div>
    </form>
  )
}
