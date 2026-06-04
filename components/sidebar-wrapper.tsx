'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'

import { AppSidebar } from '@/components/app-sidebar'
import type { CurrentUser } from '@/lib/auth'

export function SidebarWrapper({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AppSidebar user={user} onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6 xl:px-8">
        <button
          className="mb-4 flex items-center gap-2 rounded-lg p-2 text-[#5a6a82] hover:bg-[#EEF4FF] md:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
          <span className="text-sm font-medium">Menú</span>
        </button>
        {children}
      </main>
    </div>
  )
}
