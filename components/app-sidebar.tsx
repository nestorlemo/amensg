import Link from 'next/link'

import type { CurrentUser } from '@/lib/auth'
import { navigationItems } from '@/lib/navigation'

export function AppSidebar({ user }: { user: CurrentUser }) {
  const items = navigationItems.filter((item) => user.rol === 'ADMIN' || !item.adminOnly)
  const displayName = user.nombre || user.email

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="shrink-0 px-4 py-5">
        <p className="text-lg font-semibold text-slate-950">AMENSG</p>
        <p className="text-sm text-slate-500">Activaciones</p>
      </div>
      <nav aria-label="Principal" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          ))}
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
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
            type="submit"
          >
            Salir
          </button>
        </form>
      </div>
    </aside>
  )
}
