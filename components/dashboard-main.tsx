'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Upload, Calculator, BarChart2, Receipt, FileText, ArrowRight, CreditCard,
} from 'lucide-react'

import { StatCardExtended } from '@/components/ui/index'
import { PageHeader } from '@/components/page-header'
import { ProcesoMensual } from '@/components/dashboard-proceso-mensual'

type Stats = {
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

      <ProcesoMensual />

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
              <StatCardExtended
                label="Activaciones cobradas"
                value={fmt(activacionesCobradas)}
                badge="COBRADO"
                badgeColor="green"
                vs={vsText(activacionesCobradas, mesAnterior.activacionesCobradas, mesAnterior.tieneDatos)}
                vsLabel={mesAnteriorNombre}
              />
              <StatCardExtended
                label="Activaciones pendientes"
                value={fmt(activacionesPendientes)}
                badge="FACTURADO"
                badgeColor="amber"
                vs={vsText(activacionesPendientes, mesAnterior.activacionesPendientes, mesAnterior.tieneDatos)}
                vsLabel={mesAnteriorNombre}
              />
              <StatCardExtended
                label="Desarrollo pendiente"
                value={fmt(desarrolloPendienteUSD)}
                valuePrefix="USD"
                badge="FACTURADO"
                badgeColor="amber"
                vs={vsText(desarrolloPendienteUSD, mesAnterior.desarrolloPendienteUSD, mesAnterior.tieneDatos)}
                vsLabel={mesAnteriorNombre}
                sub={Number(desarrolloPendienteUYU) > 0 ? `≈ UYU ${fmt(desarrolloPendienteUYU)}` : undefined}
              />
              <StatCardExtended
                label="Resultado estimado"
                value={fmt(resultadoEstimado)}
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
