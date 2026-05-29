import Link from 'next/link'
import type { ReactNode } from 'react'

import { ReabrirCierreForm } from '@/components/reabrir-cierre-form'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getCierres } from '@/lib/liquidaciones'

export const dynamic = 'force-dynamic'

export default async function CierresPage() {
  const user = await getCurrentUser()
  const { rows } = await getCierres()

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Cierres</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Cierres mensuales</h1>
        <p className="mt-2 text-sm text-slate-600">
          Desde esta pantalla se consultan cierres históricos y se pueden reabrir períodos cerrados.
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <Th>Periodo</Th>
              <Th>Estado</Th>
              <Th>Total activaciones</Th>
              <Th>Ingresos sin IVA</Th>
              <Th>Total gastos</Th>
              <Th>Resultado distribuible</Th>
              <Th>Fecha cierre</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-200" key={row.id}>
                <Td>{formatPeriod(row.anio, row.mes)}</Td>
                <Td>{row.estado}</Td>
                <Td>{row.totalActivaciones}</Td>
                <Td>{row.totalIngresosSinIva}</Td>
                <Td>{row.totalGastos}</Td>
                <Td>{row.resultadoDistribuible}</Td>
                <Td>{formatDate(row.cerradoAt)}</Td>
                <Td>
                  <div className="flex min-w-0 flex-wrap items-start gap-3">
                    <Link className="py-2 font-semibold text-slate-950 underline" href={`/cierres/${row.id}`}>
                      Ver detalle
                    </Link>
                    {isAdmin(user) && isCerrado(row.estado) ? <ReabrirCierreForm cierreId={row.id} /> : null}
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={8}>No hay cierres mensuales registrados.</Td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-slate-700" colSpan={colSpan}>
      {children}
    </td>
  )
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
