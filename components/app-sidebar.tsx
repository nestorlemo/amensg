'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Upload, Zap, FileText, CreditCard, Building2,
  Receipt, PlusCircle, Calculator, Lock, BarChart2, Settings,
  Users, UserCog, Shield, LogOut, Bug, FileCode2, Wallet, X, type LucideIcon
} from 'lucide-react'

import type { CurrentUser } from '@/lib/auth'
import { navigationItems } from '@/lib/navigation'
import { PerfilModal } from '@/components/perfil-modal'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Upload, Zap, FileText, CreditCard, Building2,
  Receipt, PlusCircle, Calculator, Lock, BarChart2, Settings,
  Users, UserCog, Shield, Bug, FileCode2, Wallet,
}

function LogoMark() {
  return (
    <svg viewBox="0 0 100 110" width="36" height="40" aria-hidden="true">
      <path
        d="M 50 5 L 93 30 L 93 80 L 50 105 L 7 80 L 7 30 Z"
        fill="none"
        stroke="#1769E0"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <line x1="27" y1="73" x2="73" y2="37" stroke="#1769E0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="27" cy="73" r="7" fill="#1769E0" />
      <circle cx="50" cy="55" r="9" fill="#19C3FF" />
      <circle cx="73" cy="37" r="7" fill="#1769E0" />
    </svg>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="pt-4 pb-1 px-1">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-amensg-border" />
        <span className="text-xs font-semibold uppercase tracking-widest whitespace-nowrap text-amensg-subtle">
          {label}
        </span>
        <div className="h-px flex-1 bg-amensg-border" />
      </div>
    </div>
  )
}

export function AppSidebar({ user, onClose }: { user: CurrentUser; onClose?: () => void }) {
  const pathname = usePathname()
  const [showPerfil, setShowPerfil] = useState(false)
  const visibleItems = navigationItems.filter((item) => {
    if (item.adminOnly) return user.rol === 'ADMIN'
    if (item.roles) return item.roles.includes(user.rol)
    if (user.rol === 'ISSUES') return false
    return true
  })

  const displayName = user.nombre || user.email

  // Build list: interleave section dividers before items that start a new section
  const renderedSections = new Set<string>()

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-white border-r border-amensg-border">
      {/* Brand */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-5">
        <LogoMark />
        <p className="text-base font-bold flex-1 text-amensg-navy" style={{ letterSpacing: '-0.01em' }}>amensg</p>
        {onClose ? (
          <button
            className="rounded-lg p-1 text-amensg-muted hover:bg-amensg-hover md:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav aria-label="Principal" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">
          {visibleItems.flatMap((item) => {
            const Icon = iconMap[item.icon]
            const elements: React.ReactNode[] = []

            if (item.section && !renderedSections.has(item.section)) {
              renderedSections.add(item.section)
              elements.push(<SectionDivider key={`sec-${item.section}`} label={item.section} />)
            } else if (item.adminOnly && !renderedSections.has('ADMINISTRACIÓN')) {
              renderedSections.add('ADMINISTRACIÓN')
              elements.push(<SectionDivider key="sec-admin" label="Administración" />)
            }

            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/')

            elements.push(
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-amensg-hover hover:text-amensg-blue"
                style={isActive
                  ? { background: 'var(--hover-bg)', color: 'var(--tech-blue)', fontWeight: 600, borderLeft: '3px solid var(--tech-blue)', paddingLeft: '9px' }
                  : { color: 'var(--muted-text)' }
                }
              >
                {Icon ? <Icon size={16} className="shrink-0" /> : null}
                {item.label}
              </Link>
            )
            return elements
          })}
        </div>
      </nav>

      {/* User + Logout */}
      <div className="shrink-0 p-4 border-t border-amensg-border">
        {showPerfil ? <PerfilModal user={user} onClose={() => setShowPerfil(false)} /> : null}
        <button
          className="flex min-w-0 w-full items-center gap-3 rounded-lg px-1 py-1 hover:bg-amensg-hover transition-colors text-left"
          onClick={() => setShowPerfil(true)}
          title="Editar mi perfil"
          type="button"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'var(--gradient-avatar)' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-amensg-navy" title={displayName}>
              {displayName}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-amensg-subtle">
              {user.rol}
            </p>
          </div>
        </button>
        <form action="/api/auth/logout" className="mt-3" method="post">
          <button
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors bg-amensg-hover text-amensg-blue hover:bg-blue-100"
            type="submit"
          >
            <LogOut size={14} />
            Salir
          </button>
        </form>
      </div>
    </aside>
  )
}
