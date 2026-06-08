'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard, Upload, Zap, Building2,
  Calculator, BarChart2, Receipt, FileText, ArrowRight, AlertTriangle,
} from 'lucide-react'

import { StatCard } from '@/components/ui/primitives'

type Stats = {
  pendingCobros: number
  cobrosVencidos: number
  activeImports: number
  importsThisMonth: number
  activeEmpresas: number
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

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => { /* leave skeleton */ })
  }, [])

  return (
    <div className="space-y-8">
      <DashboardHeader
        subtitle="Sistema de facturación mensual de activaciones"
      />

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

export function DashboardHeader({ subtitle }: { subtitle: string }) {
  return (
    <header
      className="relative overflow-hidden rounded-2xl px-8 py-8"
      style={{ background: 'var(--gradient-header)' }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,195,255,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '-30px', left: '30%',
          width: '160px', height: '160px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(32,224,178,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div className="relative mb-1 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full"
          style={{ background: '#20E0B2', boxShadow: '0 0 6px #20E0B2' }}
        />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Sistema activo
        </p>
      </div>
      <h1 className="relative text-3xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
        Bienvenido a amensg
      </h1>
      <p className="relative mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {subtitle}
      </p>
    </header>
  )
}
