import './globals.css'
import type { ReactNode } from 'react'

import { AppSidebar } from '@/components/app-sidebar'

export const metadata = {
  title: 'AMENSG',
  description: 'Sistema de facturacion de activaciones AMENSG',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen bg-slate-50">
          <AppSidebar />
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 md:px-6 xl:px-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
