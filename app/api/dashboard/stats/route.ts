import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const auth = await requireApiAuth()
  if (auth.error) return auth.error

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [pendingCobros, activeImports, importsThisMonth, activeEmpresas] = await Promise.all([
    prisma.facturacionMensual.count({
      where: { estadoCobro: { codigo: { in: ['PENDIENTE', 'ENVIADO'] } } },
    }),
    prisma.importacionActivacion.count({
      where: { estado: 'ACTIVA' },
    }),
    prisma.importacionActivacion.count({
      where: { estado: 'ACTIVA', creadaEn: { gte: startOfMonth } },
    }),
    prisma.empresa.count({
      where: { activa: true },
    }),
  ])

  return NextResponse.json({ pendingCobros, activeImports, importsThisMonth, activeEmpresas })
}
