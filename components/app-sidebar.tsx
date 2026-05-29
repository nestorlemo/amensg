import Link from 'next/link'
import {
  LayoutDashboard, Upload, Zap, FileText, CreditCard, Building2,
  Receipt, PlusCircle, Calculator, Lock, BarChart2, Settings,
  Users, UserCog, Shield, LogOut, type LucideIcon
} from 'lucide-react'

import type { CurrentUser } from '@/lib/auth'
import { navigationItems } from '@/lib/navigation'

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Upload, Zap, FileText, CreditCard, Building2,
  Receipt, PlusCircle, Calculator, Lock, BarChart2, Settings,
  Users, UserCog, Shield
}

export function AppSidebar({ user }: { user: CurrentUser }) {
  const allItems = navigationItems.filter((item) => user.rol === 'ADMIN' || !item.adminOnly)
  const regularItems = allItems.filter((item) => !item.adminOnly)
  const adminItems = allItems.filter((item) => item.adminOnly)
  const displayName = user.nombre || user.email

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="shrink-0 border-l-4 border-l-slate-950 px-4 py-5">
        <p className="text-lg font-bold text-slate-950">AMENSG</p>
        <p className="text-xs text-slate-500 uppercase tracking-wide">Activaciones</p>
      </div>
      <nav aria-label="Principal" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {regularItems.map((item) => {
            const Icon = iconMap[item.icon]
            return (
              <li key={item.href}>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors"
                  href={item.href}
                >
                  {Icon ? <Icon size={16} className="text-slate-500 shrink-0" /> : null}
                  {item.label}
                </Link>
              </li>
            )
          })}
          {adminItems.length > 0 ? (
            <>
              <li className="pt-3 pb-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Administración</p>
              </li>
              {adminItems.map((item) => {
                const Icon = iconMap[item.icon]
                return (
                  <li key={item.href}>
                    <Link
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors"
                      href={item.href}
                    >
                      {Icon ? <Icon size={16} className="text-slate-500 shrink-0" /> : null}
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </>
          ) : null}
        </ul>
      </nav>
      <div className="shrink-0 border-t border-slate-200 bg-white p-4 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950" title={displayName}>
              {displayName}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase text-slate-500">{user.rol}</p>
          </div>
        </div>
        <form action="/api/auth/logout" className="mt-3" method="post">
          <button
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
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
