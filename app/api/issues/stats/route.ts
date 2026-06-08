import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const issues = await prisma.issue.findMany({
    where: { eliminado: false },
    select: { estado: true, totalHoras: true },
  })

  const enProduccion = issues.filter((i) => i.estado === 'EN_PRODUCCION')
  const totalHoras   = enProduccion.reduce((s, i) => s + Number(i.totalHoras), 0)

  return NextResponse.json({
    total:        issues.length,
    enProduccion: enProduccion.length,
    totalHoras,
  })
}
