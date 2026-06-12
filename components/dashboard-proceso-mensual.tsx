'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

type ProcesoData = {
  periodo: { anio: number; mes: number; nombre: string }
  importacion: { completo: boolean; empresasFaltantes: string[] }
  issuesFacturables: { cantidad: number }
  liquidacion: { existe: boolean; estado: string | null }
  transferencias: { generadas: boolean; cantidad: number }
  facturacionActivaciones: { pendientes: number }
}

type StepProps = {
  ok: boolean
  label: string
  detail: string
}

function Step({ ok, label, detail }: StepProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl bg-white p-4"
      style={{
        border: `1px solid ${ok ? '#20E0B2' : '#f59e0b'}`,
        boxShadow: '0 1px 4px rgba(23,105,224,0.06)',
      }}
    >
      {ok
        ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: '#20E0B2' }} />
        : <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8ba3c7' }}>{label}</p>
        <p className="mt-0.5 text-sm font-medium" style={{ color: ok ? '#0d7a5f' : '#92400e' }}>{detail}</p>
      </div>
    </div>
  )
}

function StepSkeleton() {
  return (
    <div className="rounded-xl bg-white p-4" style={{ border: '1px solid #e6eefc', boxShadow: '0 1px 4px rgba(23,105,224,0.06)' }}>
      <div className="h-3 w-24 animate-pulse rounded bg-amensg-surface" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded bg-amensg-surface" />
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

  const steps = data ? buildSteps(data) : null

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#8ba3c7' }}>
        Proceso de {data?.periodo.nombre ?? '…'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps
          ? steps.map((s) => <Step key={s.label} {...s} />)
          : Array.from({ length: 5 }).map((_, i) => <StepSkeleton key={i} />)}
      </div>
    </section>
  )
}

function buildSteps(d: ProcesoData): StepProps[] {
  const imp = d.importacion
  const liq = d.liquidacion
  const tr  = d.transferencias
  const fa  = d.facturacionActivaciones
  const iss = d.issuesFacturables

  return [
    {
      ok: imp.completo,
      label: 'Importación',
      detail: imp.completo
        ? 'Completa'
        : `Faltan: ${imp.empresasFaltantes.join(', ')}`,
    },
    {
      ok: iss.cantidad === 0,
      label: 'Issues a facturar',
      detail: iss.cantidad === 0
        ? 'Sin pendientes'
        : `${iss.cantidad} pendiente${iss.cantidad !== 1 ? 's' : ''}`,
    },
    {
      ok: liq.existe && liq.estado?.trim().toUpperCase() === 'CERRADO',
      label: 'Liquidación',
      detail: !liq.existe
        ? 'Sin cerrar'
        : liq.estado?.trim().toUpperCase() === 'CERRADO'
          ? 'Cerrada'
          : `Estado: ${liq.estado}`,
    },
    {
      ok: tr.generadas,
      label: 'Transferencias',
      detail: tr.generadas
        ? `Generadas (${tr.cantidad})`
        : 'Sin generar',
    },
    {
      ok: fa.pendientes === 0,
      label: 'Facturación activaciones',
      detail: fa.pendientes === 0
        ? 'Completa'
        : `${fa.pendientes} pendiente${fa.pendientes !== 1 ? 's' : ''}`,
    },
  ]
}
