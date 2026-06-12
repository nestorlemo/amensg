'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/index'

type ProcesoData = {
  periodo: { anio: number; mes: number; nombre: string }
  issuesFacturables: { pendientes: number; enProduccionSinFacturar: number; enDesarrollo: number }
  liquidacion: { periodo: string | null; fechaCierre: string | null }
  transferencias: { completas: boolean; pendientes: number }
  facturacionActivaciones: { completas: boolean; pendientes: number }
}

function formatFecha(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-UY').format(new Date(iso))
}

function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        ok
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      {ok
        ? <CheckCircle2 size={14} className="shrink-0" />
        : <AlertTriangle size={14} className="shrink-0" />}
      {text}
    </span>
  )
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl bg-white p-4"
      style={{ border: '1px solid #e6eefc', boxShadow: '0 1px 4px rgba(23,105,224,0.06)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8ba3c7' }}>{label}</p>
      {children}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-white p-4" style={{ border: '1px solid #e6eefc', boxShadow: '0 1px 4px rgba(23,105,224,0.06)' }}>
      <div className="h-3 w-24 animate-pulse rounded bg-amensg-surface" />
      <div className="mt-3 h-6 w-32 animate-pulse rounded-full bg-amensg-surface" />
    </div>
  )
}

export function ProcesoMensual() {
  const [data, setData] = useState<ProcesoData | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/proceso-mensual')
      .then((r) => r.json())
      .then((d: ProcesoData) => setData(d))
      .catch(() => { /* leave skeleton */ })
  }, [])

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#8ba3c7' }}>
        Proceso de {data?.periodo.nombre ?? '…'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data ? (
          <>
            {/* Issues a facturar */}
            <Card label="Issues a facturar">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="pendiente" label={`${data.issuesFacturables.pendientes} pendientes`} />
                <Badge variant="DESARROLLO" label={`${data.issuesFacturables.enDesarrollo} en desarrollo`} />
                <Badge variant="facturado" label={`${data.issuesFacturables.enProduccionSinFacturar} en prod. sin facturar`} />
              </div>
            </Card>

            {/* Liquidación */}
            <Card label="Liquidación">
              <div className="flex flex-col gap-1">
                <StatusBadge
                  ok={data.liquidacion.periodo !== null}
                  text={data.liquidacion.periodo ? `Cerrada ${data.liquidacion.periodo}` : 'Sin cerrar'}
                />
                {data.liquidacion.fechaCierre && (
                  <span className="text-xs" style={{ color: '#8ba3c7' }}>
                    {formatFecha(data.liquidacion.fechaCierre)}
                  </span>
                )}
              </div>
            </Card>

            {/* Transferencias */}
            <Card label="Transferencias">
              <StatusBadge
                ok={data.transferencias.completas}
                text={data.transferencias.completas ? 'Al día' : `${data.transferencias.pendientes} pendientes`}
              />
            </Card>

            {/* Facturación activaciones */}
            <Card label="Facturación activaciones">
              <StatusBadge
                ok={data.facturacionActivaciones.completas}
                text={data.facturacionActivaciones.completas ? 'Al día' : `${data.facturacionActivaciones.pendientes} pendientes`}
              />
            </Card>
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        )}
      </div>
    </section>
  )
}
