import './globals.css'
import type { ReactNode } from 'react'

import { SidebarWrapper } from '@/components/sidebar-wrapper'
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
          <SidebarWrapper user={user}>{children}</SidebarWrapper>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
