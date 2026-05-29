import Link from 'next/link'
import { CreditCard, Upload, Zap, Building2, Calculator, BarChart2, Receipt, FileText } from 'lucide-react'

import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/primitives'

const quickLinks = [
  { href: '/importaciones/nueva', label: 'Nueva importación', icon: Upload },
  { href: '/cobros', label: 'Gestionar cobros', icon: CreditCard },
  { href: '/liquidaciones', label: 'Ver liquidación', icon: Calculator },
  { href: '/reportes', label: 'Centro de reportes', icon: BarChart2 },
  { href: '/gastos', label: 'Registrar gastos', icon: Receipt },
  { href: '/facturacion', label: 'Ver facturación', icon: FileText },
]

export default async function DashboardPage() {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [pendingCobros, importsThisMonth, activeEmpresas, activeImports] = await Promise.all([
    prisma.facturacionMensual.count({
      where: { estadoCobro: { codigo: { in: ['PENDIENTE', 'ENVIADO'] } } },
    }),
    prisma.importacionActivacion.count({
      where: { estado: 'ACTIVA', creadaEn: { gte: startOfMonth } },
    }),
    prisma.empresa.count({ where: { activa: true } }),
    prisma.importacionActivacion.count({ where: { estado: 'ACTIVA' } }),
  ])

  return (
    <div className="space-y-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-medium uppercase text-slate-500">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Bienvenido a AMENSG</h1>
        <p className="mt-2 text-sm text-slate-600">Sistema de facturación mensual de activaciones.</p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Resumen operativo</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Cobros pendientes" value={pendingCobros} icon={CreditCard} accent="amber" />
          <StatCard label="Importaciones activas" value={activeImports} icon={Upload} />
          <StatCard label="Importaciones este mes" value={importsThisMonth} icon={Zap} accent="green" />
          <StatCard label="Empresas activas" value={activeEmpresas} icon={Building2} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Accesos rápidos</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              <link.icon size={18} className="text-slate-400" />
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
