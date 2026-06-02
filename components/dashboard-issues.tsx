'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bug, PlusCircle, ArrowRight } from 'lucide-react'

import { DashboardHeader } from '@/components/dashboard-main'

type IssuesStats = {
  pendientes: number
  enDesarrollo: number
  enProduccionMes: number
  montoEstimadoMes: number
  valorHora: number
}

const MUTED  = '#8ba3c7'
const TEXT   = '#0B1F3A'
const BORDER = '#e6eefc'

const accentConfig = {
  default:  { border: BORDER,     iconBg: 'rgba(23,105,224,0.08)',  iconColor: '#1769E0' },
  amber:    { border: '#f59e0b',  iconBg: 'rgba(245,158,11,0.10)', iconColor: '#f59e0b' },
  green:    { border: '#20E0B2',  iconBg: 'rgba(32,224,178,0.12)', iconColor: '#20E0B2' },
  purple:   { border: '#8b5cf6',  iconBg: 'rgba(139,92,246,0.10)', iconColor: '#8b5cf6' },
} as const
type Accent = keyof typeof accentConfig

function StatCard({
  label, value, accent = 'default', children,
}: {
  label: string; value: string | null; accent?: Accent; children: React.ReactNode
}) {
  const cfg = accentConfig[accent]
  return (
    <div
      className="relative rounded-xl p-5"
      style={{ background: '#fff', border: `1px solid ${cfg.border}`, boxShadow: '0 1px 4px rgba(23,105,224,0.06)' }}
    >
      <div
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ background: cfg.iconBg, color: cfg.iconColor }}
      >
        {children}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>{label}</p>
      {value === null ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded-lg" style={{ background: '#F5F7FA' }} />
      ) : (
        <p className="mt-2 text-2xl font-bold" style={{ color: TEXT }}>{value}</p>
      )}
    </div>
  )
}

const quickLinks = [
  { href: '/issues',        label: 'Ver issues',   color: '#1769E0', bg: 'rgba(23,105,224,0.08)',  Icon: Bug },
  { href: '/issues?nuevo=1', label: 'Nuevo issue',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', Icon: PlusCircle },
]

export function DashboardIssues() {
  const [stats, setStats] = useState<IssuesStats | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats?rol=ISSUES')
      .then((r) => r.json())
      .then((data: IssuesStats) => setStats(data))
      .catch(() => { /* leave skeleton */ })
  }, [])

  const monto = stats
    ? stats.montoEstimadoMes > 0
      ? `$${stats.montoEstimadoMes.toFixed(2)} USD`
      : stats.valorHora > 0 ? '$0.00 USD' : 'Sin configurar'
    : null

  return (
    <div className="space-y-8">
      <DashboardHeader subtitle="Gestión de Issues — Sistema Logística" />

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
          Resumen de desarrollo
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Issues pendientes"            value={stats ? String(stats.pendientes)      : null} accent="amber">
            <Bug size={18} />
          </StatCard>
          <StatCard label="En desarrollo"               value={stats ? String(stats.enDesarrollo)    : null}>
            <Bug size={18} />
          </StatCard>
          <StatCard label="En producción este mes"      value={stats ? String(stats.enProduccionMes) : null} accent="green">
            <Bug size={18} />
          </StatCard>
          <StatCard label="Monto estimado este mes"     value={monto} accent="purple">
            <Bug size={18} />
          </StatCard>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
          Accesos rápidos
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
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
