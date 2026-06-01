import Link from 'next/link'
import type { ReactNode } from 'react'

import { ChangeEstadoCobroForm } from '@/components/change-estado-cobro-form'
import { PageHeader } from '@/components/page-header'
import { getFacturacion } from '@/lib/read-models'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function FacturacionPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const { rows, filters } = await getFacturacion(params)
  const selectedFacturacionId = stringValue(params.editarCobro)
  const selectedFacturacion = rows.find((row) => row.id === selectedFacturacionId)

  return (
    <div className="space-y-6">
      <PageHeader
        section="Facturación"
        title="Facturación mensual"
        description="Consulta de facturaciones generadas por importación."
      />

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-4" method="get">
        <FilterInput label="Anio" name="anio" value={stringValue(params.anio)} placeholder="2026" />
        <FilterInput label="Mes" name="mes" value={stringValue(params.mes)} placeholder="4" />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Empresa
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
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
        <FilterInput label="Importacion ID" name="importacionId" value={stringValue(params.importacionId)} />
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Estado cobro
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            defaultValue={stringValue(params.estadoCobro)}
            name="estadoCobro"
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
          <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
            Filtrar
          </button>
          <Link className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-slate-600" href="/facturacion">
            Limpiar
          </Link>
        </div>
      </form>

      {selectedFacturacion ? (
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase text-slate-500">Cambiar estado de cobro</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                {selectedFacturacion.empresa} - {formatPeriod(selectedFacturacion.anio, selectedFacturacion.mes)}
              </h2>
              <p className="mt-1 text-sm text-slate-600">Total: {selectedFacturacion.total}</p>
              {selectedFacturacion.periodoCerrado ? (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  El período ya está cerrado. No se puede modificar el estado de cobro.
                </p>
              ) : null}
              {selectedFacturacion.importacionAnulada ? (
                <p className="mt-2 text-sm font-medium text-red-700">
                  La importación asociada está anulada. Esta facturación no participa en la operación.
                </p>
              ) : null}
            </div>
            <Link className="text-sm font-semibold text-slate-600 underline" href={`/facturacion?${withoutParam(params, 'editarCobro')}`}>
              Cerrar
            </Link>
          </div>
          <div className="mt-4 max-w-xl">
            <ChangeEstadoCobroForm
              estadoCobroId={selectedFacturacion.estadoCobroId}
              estadosCobro={filters.estadosCobro}
              facturacionId={selectedFacturacion.id}
              fechaCobro={selectedFacturacion.fechaCobro}
              observaciones={selectedFacturacion.observaciones}
              disabled={selectedFacturacion.periodoCerrado || selectedFacturacion.importacionAnulada}
            />
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-[1080px] text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Empresa</Th>
              <Th>Periodo</Th>
              <Th align="right">Cantidad facturable</Th>
              <Th align="right">Precio unitario</Th>
              <Th align="right">Subtotal</Th>
              <Th align="right">IVA</Th>
              <Th align="right">Total</Th>
              <Th>Estado cobro</Th>
              <Th>Fecha cobro</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200" key={row.id}>
                <Td>{row.empresa}</Td>
                <Td>{formatPeriod(row.anio, row.mes)}</Td>
                <Td align="right">{row.cantidadFacturable}</Td>
                <Td align="right">{row.precioUnitario}</Td>
                <Td align="right">{row.subtotal}</Td>
                <Td align="right">{row.iva}</Td>
                <Td align="right">{row.total}</Td>
                <Td>
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${row.importacionAnulada ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                    {row.estadoCobro}
                  </span>
                  {row.importacionAnulada ? <div className="mt-1 text-xs font-medium text-red-700">Importación anulada</div> : null}
                </Td>
                <Td>{row.fechaCobro ? formatDate(row.fechaCobro) : 'Sin registrar'}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {row.periodoCerrado || row.importacionAnulada ? (
                      <span className="font-medium text-slate-400" title="El período ya está cerrado. No se puede modificar el estado de cobro.">
                        Cambiar
                      </span>
                    ) : (
                      <Link className="font-semibold text-slate-950 underline" href={`/facturacion?${withParam(params, 'editarCobro', row.id)}`}>
                        Cambiar
                      </Link>
                    )}
                    <Link
                      className="font-semibold text-slate-950 underline"
                      href={`/activaciones?importacionId=${row.importacionId}&empresaId=${row.empresaId}`}
                    >
                      Activaciones
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={10}>No hay facturaciones para los filtros seleccionados.</Td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterInput({
  label,
  name,
  value,
  placeholder,
}: {
  label: string
  name: string
  value: string
  placeholder?: string
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
      />
    </label>
  )
}

function Th({ align = 'left', children }: { align?: 'left' | 'right'; children: ReactNode }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>
}

function Td({ align = 'left', children, colSpan }: { align?: 'left' | 'right'; children: ReactNode; colSpan?: number }) {
  return (
    <td className={`whitespace-nowrap px-4 py-2.5 text-slate-700 ${align === 'right' ? 'text-right tabular-nums' : 'text-left'}`} colSpan={colSpan}>
      {children}
    </td>
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

function withParam(params: Record<string, string | string[] | undefined>, key: string, value: string) {
  const next = new URLSearchParams()

  for (const [paramKey, paramValue] of Object.entries(params)) {
    const stringified = stringValue(paramValue)
    if (stringified && paramKey !== key) {
      next.set(paramKey, stringified)
    }
  }

  next.set(key, value)
  return next.toString()
}

function withoutParam(params: Record<string, string | string[] | undefined>, key: string) {
  const next = new URLSearchParams()

  for (const [paramKey, paramValue] of Object.entries(params)) {
    const stringified = stringValue(paramValue)
    if (stringified && paramKey !== key) {
      next.set(paramKey, stringified)
    }
  }

  return next.toString()
}
