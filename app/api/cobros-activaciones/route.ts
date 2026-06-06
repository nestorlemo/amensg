import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function parseIsoMonth(isoMonth: string): { anio: number; mes: number } | null {
  const [y, m] = isoMonth.split('-')
  const anio = parseInt(y ?? '', 10)
  const mes  = parseInt(m ?? '', 10)
  if (!anio || !mes || mes < 1 || mes > 12) return null
  return { anio, mes }
}

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const desde     = searchParams.get('desde')     ?? undefined // 'YYYY-MM'
  const hasta     = searchParams.get('hasta')     ?? undefined // 'YYYY-MM'
  const empresaId = searchParams.get('empresaId') ?? undefined

  if (!desde || !hasta) {
    return NextResponse.json({ error: 'desde y hasta son requeridos (YYYY-MM)' }, { status: 422 })
  }

  const desdeP = parseIsoMonth(desde)
  const hastaP = parseIsoMonth(hasta)
  if (!desdeP || !hastaP) {
    return NextResponse.json({ error: 'Formato de fecha inválido (esperado YYYY-MM)' }, { status: 422 })
  }

  // Build range condition: (anio, mes) in [desde, hasta]
  const rangeWhere = {
    OR: [
      // Same year range
      {
        AND: [
          { anio: desdeP.anio },
          { anio: hastaP.anio },
          { mes: { gte: desdeP.mes, lte: hastaP.mes } },
        ],
      },
      // Multi-year: start year with mes >= desde
      { anio: desdeP.anio, mes: { gte: desdeP.mes } },
      // Multi-year: middle years
      ...(hastaP.anio - desdeP.anio > 1
        ? [{ anio: { gt: desdeP.anio, lt: hastaP.anio } }]
        : []),
      // Multi-year: end year with mes <= hasta
      ...(hastaP.anio > desdeP.anio
        ? [{ anio: hastaP.anio, mes: { lte: hastaP.mes } }]
        : []),
    ],
  }

  const facturaciones = await prisma.facturacionMensual.findMany({
    where: {
      ...rangeWhere,
      ...(empresaId ? { empresaId } : {}),
      cobroFacturaciones: { none: {} },
      importacion: { estado: { not: 'ANULADA' } },
    },
    include: {
      empresa: { select: { id: true, nombre: true } },
      estadoCobro: { select: { codigo: true, nombre: true } },
    },
    orderBy: [{ anio: 'asc' }, { mes: 'asc' }, { empresa: { nombre: 'asc' } }],
  })

  return NextResponse.json({
    facturaciones: facturaciones.map((f) => ({
      id: f.id,
      empresaId: f.empresaId,
      empresa: f.empresa.nombre,
      anio: f.anio,
      mes: f.mes,
      cantidadActivaciones: f.cantidadActivaciones,
      totalSinIva: f.totalSinIva.toString(),
      iva: f.iva.toString(),
      totalConIva: f.totalConIva.toString(),
      estadoCobro: f.estadoCobro.codigo,
    })),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const facturacionIds = Array.isArray(body.facturacionIds) ? (body.facturacionIds as string[]) : []
  const estado = typeof body.estado === 'string' ? body.estado : 'FACTURADO'

  if (facturacionIds.length === 0) {
    return NextResponse.json({ error: 'Debe seleccionar al menos una facturación.' }, { status: 422 })
  }

  const facturaciones = await prisma.facturacionMensual.findMany({
    where: { id: { in: facturacionIds } },
    include: { empresa: { select: { id: true, nombre: true } } },
    orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
  })

  if (facturaciones.length === 0) {
    return NextResponse.json({ error: 'No se encontraron facturaciones.' }, { status: 404 })
  }

  // Aggregate totals
  const { Prisma } = await import('@prisma/client')
  const totalSinIva = facturaciones.reduce((s, f) => s.add(f.totalSinIva), new Prisma.Decimal(0))
  const totalIva    = facturaciones.reduce((s, f) => s.add(f.iva),         new Prisma.Decimal(0))
  const totalConIva = facturaciones.reduce((s, f) => s.add(f.totalConIva), new Prisma.Decimal(0))

  const first = facturaciones[0]!

  const cobro = await prisma.$transaction(async (tx) => {
    const c = await tx.cobro.create({
      data: {
        tipo: 'ACTIVACIONES',
        empresaId: first.empresaId,
        anio: first.anio,
        mes: first.mes,
        montoSinIva: totalSinIva,
        iva: totalIva,
        montoConIva: totalConIva,
        moneda: 'UYU',
        estado,
        cobroFacturaciones: {
          create: facturaciones.map((f) => ({ facturacionMensualId: f.id })),
        },
      },
    })
    return c
  })

  return NextResponse.json({ ok: true, id: cobro.id, created: facturaciones.length }, { status: 201 })
}
