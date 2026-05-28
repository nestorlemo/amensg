import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { AnularImportacionForm } from '@/components/anular-importacion-form'
import { getImportacionDetail } from '@/lib/read-models'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ImportacionDetailPage({ params }: PageProps) {
  const { id } = await params
  const importacion = await getImportacionDetail(id)

  if (!importacion) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <Link className="text-sm font-semibold text-slate-600 underline" href="/importaciones">
          Volver a importaciones
        </Link>
        <p className="mt-4 text-sm font-medium uppercase text-slate-500">Importacion</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{formatPeriod(importacion.anio, importacion.mes)}</h1>
        <p className="mt-2 text-sm text-slate-600">{importacion.nombreArchivo ?? 'Sin nombre de archivo'}</p>
        {isConfirmada(importacion.estado) ? (
          <div className="mt-4">
            <AnularImportacionForm buttonLabel="Anular importación" importacionId={importacion.id} />
          </div>
        ) : null}
        {isAnulada(importacion.estado) ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-950">
            <p className="font-semibold">Esta importación fue anulada.</p>
            <p className="mt-1">Fecha de anulación: {formatDate(importacion.anuladaEn)}</p>
            <p className="mt-1">Motivo: {importacion.motivoAnulacion ?? 'Sin motivo registrado'}</p>
          </div>
        ) : null}
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Estado" value={importacion.estado} />
        <Metric label="Filas" value={importacion.totalRows} />
        <Metric label="Completadas" value={importacion.completedActivations} />
        <Metric label="Sin fecha real" value={importacion.withoutRealActivationDate} />
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          href={`/activaciones?importacionId=${importacion.id}`}
        >
          Ver activaciones
        </Link>
        <Link
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          href={`/facturacion?importacionId=${importacion.id}`}
        >
          Ver facturacion
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">Empresas</h2>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Empresa archivo</Th>
                <Th>Total filas</Th>
                <Th>Completadas</Th>
                <Th>Sin fecha real</Th>
              </tr>
            </thead>
            <tbody>
              {importacion.companyCounts.map((row) => (
                <tr className="border-t border-slate-200" key={`${row.empresaId}:${row.empresaNombreArchivo}`}>
                  <Td>{row.empresaNombreArchivo}</Td>
                  <Td>{row.totalRows}</Td>
                  <Td>{row.completedActivations}</Td>
                  <Td>{row.withoutRealActivationDate}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">Facturacion generada</h2>
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <Th>Empresa</Th>
                <Th>Cantidad</Th>
                <Th>Precio unitario</Th>
                <Th>Subtotal</Th>
                <Th>IVA</Th>
                <Th>Total</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {importacion.facturaciones.map((facturacion) => (
                <tr className="border-t border-slate-200" key={facturacion.id}>
                  <Td>{facturacion.empresa}</Td>
                  <Td>{facturacion.cantidadFacturable}</Td>
                  <Td>{facturacion.precioUnitario}</Td>
                  <Td>{facturacion.subtotal}</Td>
                  <Td>{facturacion.iva}</Td>
                  <Td>{facturacion.total}</Td>
                  <Td>{facturacion.estadoCobro}</Td>
                  <Td>
                    <Link
                      className="font-semibold text-slate-950 underline"
                      href={`/activaciones?importacionId=${facturacion.importacionId}&empresaId=${facturacion.empresaId}`}
                    >
                      Ver activaciones
                    </Link>
                  </Td>
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

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="whitespace-nowrap px-4 py-3 text-slate-700">{children}</td>
}

function formatPeriod(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : 'Sin registrar'
}

function isConfirmada(estado: string) {
  return estado.trim().toUpperCase() === 'CONFIRMADA'
}

function isAnulada(estado: string) {
  return estado.trim().toUpperCase() === 'ANULADA'
}
