import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const empresaId  = searchParams.get('empresaId')  ?? undefined
  const fechaDesde = searchParams.get('fechaDesde') ?? undefined
  const fechaHasta = searchParams.get('fechaHasta') ?? undefined

  const where: Record<string, unknown> = {
    estado: 'COBRADO',
    transferenciaCobros: { none: {} },
  }
  if (empresaId) where.empresaId = empresaId
  if (fechaDesde || fechaHasta) {
    const range: Record<string, Date> = {}
    if (fechaDesde) range.gte = new Date(fechaDesde)
    if (fechaHasta) {
      const h = new Date(fechaHasta)
      h.setDate(h.getDate() + 1)
      range.lt = h
    }
    where.fechaCobro = range
  }

  const cobros = await prisma.cobro.findMany({
    where,
    include: { empresa: { select: { nombre: true } } },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadoEn: 'desc' }],
  })

  return NextResponse.json({
    cobros: cobros.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      empresa: c.empresa.nombre,
      empresaId: c.empresaId,
      anio: c.anio,
      mes: c.mes,
      moneda: c.moneda,
      montoSinIva: c.montoSinIva.toString(),
      montoConIva: c.montoConIva.toString(),
      estado: c.estado,
      fechaCobro: c.fechaCobro?.toISOString() ?? null,
    })),
  })
}
