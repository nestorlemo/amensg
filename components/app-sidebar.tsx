import Link from 'next/link'

import { navigationItems } from '@/lib/navigation'

export function AppSidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5">
      <div className="mb-6">
        <p className="text-lg font-semibold text-slate-950">AMENSG</p>
        <p className="text-sm text-slate-500">Activaciones</p>
      </div>
      <nav aria-label="Principal">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
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
    </aside>
  )
}
