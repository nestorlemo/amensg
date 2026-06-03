'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bug, PlusCircle, ArrowRight } from 'lucide-react'

import { DashboardHeader } from '@/components/dashboard-main'
import { StatCard } from '@/components/ui/primitives'

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
          <StatCard label="Issues pendientes"        value={stats ? String(stats.pendientes)      : null} accent="amber"  icon={Bug} />
          <StatCard label="En desarrollo"            value={stats ? String(stats.enDesarrollo)    : null}                icon={Bug} />
          <StatCard label="En producción este mes"   value={stats ? String(stats.enProduccionMes) : null} accent="green"  icon={Bug} />
          <StatCard label="Monto estimado este mes"  value={monto}                                        accent="purple" icon={Bug} />
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
