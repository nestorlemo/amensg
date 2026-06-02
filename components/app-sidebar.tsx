import Link from 'next/link'
import {
  LayoutDashboard, Upload, Zap, FileText, CreditCard, Building2,
  Receipt, PlusCircle, Calculator, Lock, BarChart2, Settings,
  Users, UserCog, Shield, LogOut, Bug, FileCode2, Clock, type LucideIcon
} from 'lucide-react'

import type { CurrentUser } from '@/lib/auth'
import { navigationItems } from '@/lib/navigation'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Upload, Zap, FileText, CreditCard, Building2,
  Receipt, PlusCircle, Calculator, Lock, BarChart2, Settings,
  Users, UserCog, Shield, Bug, FileCode2, Clock
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

export function AppSidebar({ user }: { user: CurrentUser }) {
  const allItems = navigationItems.filter((item) => user.rol === 'ADMIN' || !item.adminOnly)
  const regularItems = allItems.filter((item) => !item.adminOnly)
  const adminItems = allItems.filter((item) => item.adminOnly)
  const displayName = user.nombre || user.email

  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col"
      style={{ background: '#ffffff', borderRight: '1px solid #e6eefc' }}
    >
      {/* Brand */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-5">
        <LogoMark />
        <p className="text-base font-bold" style={{ color: '#0B1F3A', letterSpacing: '-0.01em' }}>amensg</p>
      </div>

      {/* Navigation */}
      <nav aria-label="Principal" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {regularItems.map((item) => {
            const Icon = iconMap[item.icon]
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#EEF4FF] hover:text-[#1769E0]"
                  style={{ color: '#5a6a82' }}
                >
                  {Icon ? <Icon size={16} className="shrink-0" /> : null}
                  {item.label}
                </Link>
              </li>
            )
          })}

          {adminItems.length > 0 ? (
            <>
              <li className="pt-4 pb-1 px-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1" style={{ background: '#e6eefc' }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-widest whitespace-nowrap"
                    style={{ color: '#8ba3c7' }}
                  >
                    Administración
                  </span>
                  <div className="h-px flex-1" style={{ background: '#e6eefc' }} />
                </div>
              </li>
              {adminItems.map((item) => {
                const Icon = iconMap[item.icon]
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[#EEF4FF] hover:text-[#1769E0]"
                      style={{ color: '#5a6a82' }}
                    >
                      {Icon ? <Icon size={16} className="shrink-0" /> : null}
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </>
          ) : null}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="shrink-0 p-4" style={{ borderTop: '1px solid #e6eefc' }}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1769E0, #19C3FF)' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: '#0B1F3A' }} title={displayName}>
              {displayName}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: '#8ba3c7' }}>
              {user.rol}
            </p>
          </div>
        </div>
        <form action="/api/auth/logout" className="mt-3" method="post">
          <button
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors hover:bg-[#dbeafe]"
            style={{ background: '#EEF4FF', color: '#1769E0' }}
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
