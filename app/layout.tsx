import './globals.css'
import type { ReactNode } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { getCurrentUser } from '@/lib/auth'

export const metadata = {
  title: 'AMENSG',
  description: 'Sistema de facturacion de activaciones AMENSG',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  return (
    <html lang="es">
      <body>
        {user ? (
          <div className="flex h-screen overflow-hidden bg-slate-50">
            <AppSidebar user={user} />
            <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6 xl:px-8">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
