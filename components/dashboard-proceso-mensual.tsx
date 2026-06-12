'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

type ProcesoData = {
  periodo: { anio: number; mes: number; nombre: string }
  importacion: { completo: boolean; empresasFaltantes: string[] }
  issuesFacturables: { pendientes: number; enProduccionSinFacturar: number; enDesarrollo: number }
  liquidacion: { periodo: string | null; fechaCierre: string | null }
  transferencias: { completas: boolean; pendientes: number }
  facturacionActivaciones: { completas: boolean; pendientes: number }
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
        <p className="mt-0.5 text-sm font-medium whitespace-pre-line" style={{ color: ok ? '#0d7a5f' : '#92400e' }}>{detail}</p>
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

function formatFecha(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-UY').format(new Date(iso))
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
  const iss = d.issuesFacturables
  const liq = d.liquidacion
  const tr  = d.transferencias
  const fa  = d.facturacionActivaciones

  // Issues: ok if nothing pending/in-progress/unfactured
  const issuesOk = iss.enProduccionSinFacturar === 0 && iss.enDesarrollo === 0
  const issuesLines: string[] = []
  if (iss.pendientes > 0)              issuesLines.push(`Pendientes: ${iss.pendientes}`)
  if (iss.enDesarrollo > 0)            issuesLines.push(`En desarrollo: ${iss.enDesarrollo}`)
  if (iss.enProduccionSinFacturar > 0) issuesLines.push(`En prod. sin facturar: ${iss.enProduccionSinFacturar}`)
  const issuesDetail = issuesLines.length > 0 ? issuesLines.join('\n') : 'Sin pendientes'

  const liqOk = liq.periodo !== null
  const liqDetail = liqOk
    ? `Cerrada${liq.fechaCierre ? ' · ' + formatFecha(liq.fechaCierre) : ''}`
    : 'Sin cerrar'

  return [
    {
      ok: imp.completo,
      label: 'Importación',
      detail: imp.completo ? 'Completa' : `Faltan: ${imp.empresasFaltantes.join(', ')}`,
    },
    {
      ok: issuesOk,
      label: 'Issues a facturar',
      detail: issuesDetail,
    },
    {
      ok: liqOk,
      label: 'Liquidación',
      detail: liqDetail,
    },
    {
      ok: tr.completas,
      label: 'Transferencias',
      detail: tr.completas ? 'Al día' : `Pendientes: ${tr.pendientes}`,
    },
    {
      ok: fa.completas,
      label: 'Facturación activaciones',
      detail: fa.completas ? 'Completa' : `Pendientes: ${fa.pendientes}`,
    },
  ]
}
