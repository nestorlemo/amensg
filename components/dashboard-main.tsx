'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard, Upload, Zap, Building2,
  Calculator, BarChart2, Receipt, FileText, ArrowRight, AlertTriangle,
} from 'lucide-react'

import { StatCard } from '@/components/ui/primitives'
import { PageHeader } from '@/components/page-header'

type Stats = {
  pendingCobros: number
  cobrosVencidos: number
  activeImports: number
  importsThisMonth: number
  activeEmpresas: number
  periodoActivo: { anio: number; mes: number }
  ultimoCierre: { anio: number; mes: number } | null
}

type Resumen = {
  periodo: { anio: number; mes: number }
  activacionesCobradas: string
  activacionesPendientes: string
  desarrolloCobrado: string
  desarrolloPendiente: string
  desarrolloPendienteUSD: string
  desarrolloPendienteUYU: string
  gastosFijos: string
  resultadoEstimado: string
  mesAnterior: { activacionesCobradas: string; activacionesPendientes: string; desarrolloPendienteUSD: string; resultadoDistribuible: string; tieneDatos: boolean }
}

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(v: string | number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
}

function vsText(current: string, prev: string, tieneDatos: boolean) {
  if (!tieneDatos) return null
  const c = Number(current)
  const p = Number(prev)
  if (p === 0) return c === 0 ? '$0,00 (0%)' : `$${fmt(prev)} (—)`
  const diff = ((c - p) / Math.abs(p)) * 100
  const sign = diff >= 0 ? '+' : ''
  return `$${fmt(prev)} (${sign}${diff.toFixed(1)}%)`
}

function ResumenCard({
  label,
  value,
  badge,
  badgeColor,
  vs,
  vsLabel,
  sub,
  valuePrefix,
}: {
  label: string
  value: string
  badge: string
  badgeColor: 'green' | 'amber' | 'blue' | 'red'
  vs: string | null
  vsLabel: string
  sub?: string
  valuePrefix?: string
}) {
  const badgeClasses = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
  }[badgeColor]

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#e6eefc] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClasses}`}>{badge}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-slate-950">
        {valuePrefix ? <span className="mr-1 text-base font-semibold text-slate-400">{valuePrefix}</span> : null}
        {fmt(value)}
      </p>
      {sub ? <p className="text-xs font-medium text-slate-400">{sub}</p> : null}
      {vs !== null ? (
        <p className="text-xs text-slate-400">
          vs {vsLabel}:{' '}
          <span className={vs.includes('(-)') || vs.startsWith('$-') ? 'text-red-500' : 'text-emerald-600'}>
            {vs}
          </span>
        </p>
      ) : (
        <p className="text-xs text-slate-400">vs {vsLabel}: sin datos</p>
      )}
    </div>
  )
}

const MUTED  = '#8ba3c7'
const TEXT   = '#0B1F3A'
const BORDER = '#e6eefc'

const quickLinks = [
  { href: '/importaciones/nueva', label: 'Nueva importación',  color: '#1769E0', bg: 'rgba(23,105,224,0.08)',  Icon: Upload },
  { href: '/cobros',              label: 'Gestionar cobros',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  Icon: CreditCard },
  { href: '/liquidaciones',       label: 'Ver liquidación',    color: '#20E0B2', bg: 'rgba(32,224,178,0.12)',  Icon: Calculator },
  { href: '/reportes',            label: 'Centro de reportes', color: '#1769E0', bg: 'rgba(23,105,224,0.08)',  Icon: BarChart2 },
  { href: '/gastos',              label: 'Registrar gastos',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  Icon: Receipt },
  { href: '/facturacion',         label: 'Ver facturación',    color: '#19C3FF', bg: 'rgba(25,195,255,0.10)',  Icon: FileText },
]

export function DashboardMain() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => { /* leave skeleton */ })
    fetch('/api/dashboard/resumen')
      .then((r) => r.json())
      .then((data: Resumen) => setResumen(data))
      .catch(() => { /* leave skeleton */ })
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        section="SISTEMA ACTIVO"
        title="Bienvenido a amensg"
        description="Sistema de facturación mensual de activaciones"
        statusDot
      />

      {stats?.periodoActivo && (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-4 py-2.5 text-xs font-medium"
          style={{ background: '#EEF4FF', borderLeft: '3px solid #1769E0', color: '#1769E0' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#1769E0' }} />
            Período activo: <strong>{MESES_LARGO[stats.periodoActivo.mes - 1]} {stats.periodoActivo.anio}</strong>
          </span>
          {stats.ultimoCierre && (
            <>
              <span style={{ color: '#93b4e8' }}>|</span>
              <span>Último cierre: {MESES_LARGO[stats.ultimoCierre.mes - 1]} {stats.ultimoCierre.anio}</span>
            </>
          )}
          <span style={{ color: '#93b4e8' }}>|</span>
          <Link
            href={`/liquidaciones?anio=${stats.periodoActivo.anio}&mes=${stats.periodoActivo.mes}`}
            className="font-semibold hover:underline"
            style={{ color: '#1769E0' }}
          >
            Ver liquidación →
          </Link>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
          Resumen operativo
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Cobros pendientes"
            value={stats?.pendingCobros ?? null}
            accent={stats ? (stats.cobrosVencidos > 0 ? 'red' : stats.pendingCobros > 0 ? 'amber' : 'green') : 'amber'}
            icon={CreditCard}
          />
          <StatCard label="Importaciones activas"  value={stats?.activeImports    ?? null}               icon={Upload} />
          <StatCard label="Importaciones este mes" value={stats?.importsThisMonth ?? null} accent="green" icon={Zap} />
          <StatCard label="Empresas activas"       value={stats?.activeEmpresas   ?? null}               icon={Building2} />
        </div>
        {stats && stats.cobrosVencidos > 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
            <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            <p className="flex-1 text-sm font-medium text-amber-800">
              Tenés {stats.cobrosVencidos} cobro{stats.cobrosVencidos !== 1 ? 's' : ''} con más de 30 días sin cobrar
            </p>
            <Link href="/cobros-unificado" className="text-sm font-semibold text-amber-700 hover:underline">
              Ver cobros →
            </Link>
          </div>
        ) : null}
      </section>

      {resumen ? (() => {
        const { periodo, activacionesCobradas, activacionesPendientes, desarrolloPendienteUSD, desarrolloPendienteUYU, resultadoEstimado, mesAnterior } = resumen
        const mesNombre = MESES_LARGO[periodo.mes - 1]
        const mesAnteriorNombre = periodo.mes === 1
          ? `${MESES_LARGO[11]} ${periodo.anio - 1}`
          : `${MESES_LARGO[periodo.mes - 2]} ${periodo.anio}`
        const resultadoNeg = Number(resultadoEstimado) < 0

        return (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
                Resumen {mesNombre} {periodo.anio}
              </h2>
              <Link href={`/liquidaciones?anio=${periodo.anio}&mes=${periodo.mes}`} className="text-xs font-semibold text-[#1769E0] hover:underline">
                Ver liquidación completa →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ResumenCard
                label="Activaciones cobradas"
                value={activacionesCobradas}
                badge="COBRADO"
                badgeColor="green"
                vs={vsText(activacionesCobradas, mesAnterior.activacionesCobradas, mesAnterior.tieneDatos)}
                vsLabel={mesAnteriorNombre}
              />
              <ResumenCard
                label="Activaciones pendientes"
                value={activacionesPendientes}
                badge="FACTURADO"
                badgeColor="amber"
                vs={vsText(activacionesPendientes, mesAnterior.activacionesPendientes, mesAnterior.tieneDatos)}
                vsLabel={mesAnteriorNombre}
              />
              <ResumenCard
                label="Desarrollo pendiente"
                value={desarrolloPendienteUSD}
                valuePrefix="USD"
                badge="FACTURADO"
                badgeColor="amber"
                vs={vsText(desarrolloPendienteUSD, mesAnterior.desarrolloPendienteUSD, mesAnterior.tieneDatos)}
                vsLabel={mesAnteriorNombre}
                sub={Number(desarrolloPendienteUYU) > 0 ? `≈ UYU ${fmt(desarrolloPendienteUYU)}` : undefined}
              />
              <ResumenCard
                label="Resultado estimado"
                value={resultadoEstimado}
                badge={resultadoNeg ? 'NEGATIVO' : 'ESTIMADO'}
                badgeColor={resultadoNeg ? 'red' : 'blue'}
                vs={vsText(resultadoEstimado, mesAnterior.resultadoDistribuible, mesAnterior.tieneDatos)}
                vsLabel={mesAnteriorNombre}
              />
            </div>
          </section>
        )
      })() : null}

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
          Accesos rápidos
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {quickLinks.map(({ href, label, color, bg, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-xl px-5 py-4 transition-all hover:-translate-y-px"
              style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 1px 4px rgba(23,105,224,0.06)', textDecoration: 'none' }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: bg, color }}>
                <Icon size={18} />
              </div>
              <span className="flex-1 text-sm font-medium" style={{ color: TEXT }}>{label}</span>
              <ArrowRight size={14} style={{ color: '#c8d8f0' }} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

