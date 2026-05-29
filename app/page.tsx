import { CreditCard, Upload, Zap, Building2 } from 'lucide-react'

import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/primitives'
import { DashboardQuickLinks } from '@/components/dashboard-quick-links'

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
      {/* Hero header */}
      <header
        className="relative overflow-hidden rounded-2xl px-8 py-8"
        style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #1769E0 100%)' }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '220px', height: '220px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(25,195,255,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: '-30px', left: '30%',
            width: '160px', height: '160px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(32,224,178,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="relative flex items-center gap-2 mb-1">
          <span
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{ background: '#20E0B2', boxShadow: '0 0 6px #20E0B2' }}
          />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Sistema activo
          </p>
        </div>
        <h1 className="relative text-3xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
          Bienvenido a AMENSG
        </h1>
        <p className="relative mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Sistema de facturación mensual de activaciones
        </p>
      </header>

      {/* Metrics */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#8ba3c7' }}>
          Resumen operativo
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Cobros pendientes"      value={pendingCobros}    icon={CreditCard} accent="amber" />
          <StatCard label="Importaciones activas"  value={activeImports}    icon={Upload} />
          <StatCard label="Importaciones este mes" value={importsThisMonth} icon={Zap}        accent="green" />
          <StatCard label="Empresas activas"       value={activeEmpresas}   icon={Building2} />
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#8ba3c7' }}>
          Accesos rápidos
        </h2>
        <DashboardQuickLinks />
      </section>
    </div>
  )
}
