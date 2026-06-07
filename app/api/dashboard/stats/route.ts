import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const rol = searchParams.get('rol') ?? auth.user.rol

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  if (rol === 'ISSUES') {
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    const [pendientes, enDesarrollo, enProduccionMes, valorHoraParam] = await Promise.all([
      prisma.issue.count({ where: { estado: 'PENDIENTE', eliminado: false } }),
      prisma.issue.count({ where: { estado: 'EN_DESARROLLO', eliminado: false } }),
      prisma.issue.findMany({
        where: { estado: 'EN_PRODUCCION', fechaProduccion: { gte: startOfMonth, lt: endOfMonth }, eliminado: false },
        select: { totalHoras: true },
      }),
      prisma.parametro.findUnique({ where: { clave: 'valor_hora_desarrollo_usd' } }),
    ])

    const horasProduccionMes = enProduccionMes.reduce((s, i) => s + Number(i.totalHoras), 0)
    const valorHora = valorHoraParam ? parseFloat(String(valorHoraParam.valor)) : 0
    const montoEstimadoMes = Math.round(horasProduccionMes * valorHora * 100) / 100

    return NextResponse.json({
      pendientes,
      enDesarrollo,
      enProduccionMes: enProduccionMes.length,
      montoEstimadoMes,
      valorHora,
    })
  }

  const [pendingCobros, activeImports, importsThisMonth, activeEmpresas] = await Promise.all([
    prisma.cobro.count({
      where: { estado: 'FACTURADO' },
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
