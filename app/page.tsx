'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard, Upload, Zap, Building2,
  Calculator, BarChart2, Receipt, FileText, ArrowRight,
} from 'lucide-react'

type Stats = {
  pendingCobros: number
  activeImports: number
  importsThisMonth: number
  activeEmpresas: number
}

const MUTED = '#8ba3c7'
const TEXT  = '#0B1F3A'
const BORDER = '#e6eefc'

// ── Stat cards ────────────────────────────────────────────────────────────────

const accentConfig = {
  default: { border: BORDER,     iconBg: 'rgba(23,105,224,0.08)',  iconColor: '#1769E0' },
  amber:   { border: '#f59e0b',  iconBg: 'rgba(245,158,11,0.10)', iconColor: '#f59e0b' },
  green:   { border: '#20E0B2',  iconBg: 'rgba(32,224,178,0.12)', iconColor: '#20E0B2' },
} as const
type Accent = keyof typeof accentConfig

function StatCard({
  label,
  value,
  accent = 'default',
  children,
}: {
  label: string
  value: number | null
  accent?: Accent
  children: React.ReactNode   // icon rendered directly in JSX
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

// ── Quick links ───────────────────────────────────────────────────────────────

const quickLinks = [
  { href: '/importaciones/nueva', label: 'Nueva importación',  color: '#1769E0', bg: 'rgba(23,105,224,0.08)',  Icon: Upload },
  { href: '/cobros',              label: 'Gestionar cobros',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  Icon: CreditCard },
  { href: '/liquidaciones',       label: 'Ver liquidación',    color: '#20E0B2', bg: 'rgba(32,224,178,0.12)',  Icon: Calculator },
  { href: '/reportes',            label: 'Centro de reportes', color: '#1769E0', bg: 'rgba(23,105,224,0.08)',  Icon: BarChart2 },
  { href: '/gastos',              label: 'Registrar gastos',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  Icon: Receipt },
  { href: '/facturacion',         label: 'Ver facturación',    color: '#19C3FF', bg: 'rgba(25,195,255,0.10)',  Icon: FileText },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => { /* silently leave skeleton */ })
  }, [])

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <header
        className="relative overflow-hidden rounded-2xl px-8 py-8"
        style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #1769E0 100%)' }}
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
          Sistema de facturación mensual de activaciones
        </p>
      </header>

      {/* Metrics */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>
          Resumen operativo
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Cobros pendientes"      value={stats?.pendingCobros    ?? null} accent="amber">
            <CreditCard size={18} />
          </StatCard>
          <StatCard label="Importaciones activas"  value={stats?.activeImports    ?? null}>
            <Upload size={18} />
          </StatCard>
          <StatCard label="Importaciones este mes" value={stats?.importsThisMonth ?? null} accent="green">
            <Zap size={18} />
          </StatCard>
          <StatCard label="Empresas activas"       value={stats?.activeEmpresas   ?? null}>
            <Building2 size={18} />
          </StatCard>
        </div>
      </section>

      {/* Quick links */}
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
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: bg, color }}
              >
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
