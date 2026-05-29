'use client'

import Link from 'next/link'
import { CreditCard, Upload, Calculator, BarChart2, Receipt, FileText, ArrowRight, type LucideIcon } from 'lucide-react'

const quickLinks: { href: string; label: string; icon: LucideIcon; color: string; bg: string }[] = [
  { href: '/importaciones/nueva', label: 'Nueva importación',  icon: Upload,     color: '#1769E0', bg: 'rgba(23,105,224,0.08)' },
  { href: '/cobros',              label: 'Gestionar cobros',   icon: CreditCard, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  { href: '/liquidaciones',       label: 'Ver liquidación',    icon: Calculator, color: '#20E0B2', bg: 'rgba(32,224,178,0.12)' },
  { href: '/reportes',            label: 'Centro de reportes', icon: BarChart2,  color: '#1769E0', bg: 'rgba(23,105,224,0.08)' },
  { href: '/gastos',              label: 'Registrar gastos',   icon: Receipt,    color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  { href: '/facturacion',         label: 'Ver facturación',    icon: FileText,   color: '#19C3FF', bg: 'rgba(25,195,255,0.10)' },
]

export function DashboardQuickLinks() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {quickLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group flex items-center gap-4 rounded-xl px-5 py-4 transition-all"
          style={{
            background: '#ffffff',
            border: '1px solid #e6eefc',
            boxShadow: '0 1px 4px rgba(23,105,224,0.06)',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = link.color
            el.style.boxShadow = `0 4px 16px ${link.bg}`
            el.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.borderColor = '#e6eefc'
            el.style.boxShadow = '0 1px 4px rgba(23,105,224,0.06)'
            el.style.transform = ''
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: link.bg }}
          >
            <link.icon size={18} style={{ color: link.color }} />
          </div>
          <span className="flex-1 text-sm font-medium" style={{ color: '#0B1F3A' }}>
            {link.label}
          </span>
          <ArrowRight size={14} style={{ color: '#c8d8f0' }} />
        </Link>
      ))}
    </div>
  )
}
