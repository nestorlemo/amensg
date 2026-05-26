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
          <main className="flex-1 px-8 py-7">{children}</main>
        </div>
      </body>
    </html>
  )
}
