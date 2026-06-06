import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const anio      = searchParams.get('anio')      ? parseInt(searchParams.get('anio')!)      : undefined
  const mes       = searchParams.get('mes')       ? parseInt(searchParams.get('mes')!)       : undefined
  const empresaId = searchParams.get('empresaId') ?? undefined

  if (!anio || !mes) {
    return NextResponse.json({ error: 'anio y mes son requeridos' }, { status: 422 })
  }

  // FacturacionMensual sin cobro asociado para el período
  const facturaciones = await prisma.facturacionMensual.findMany({
    where: {
      anio,
      mes,
      ...(empresaId ? { empresaId } : {}),
      cobros: { none: {} },
      importacion: { estado: { not: 'ANULADA' } },
    },
    include: {
      empresa: { select: { id: true, nombre: true } },
      estadoCobro: { select: { codigo: true, nombre: true } },
    },
    orderBy: { empresa: { nombre: 'asc' } },
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

  if (facturacionIds.length === 0) {
    return NextResponse.json({ error: 'Debe seleccionar al menos una facturación.' }, { status: 422 })
  }

  const facturaciones = await prisma.facturacionMensual.findMany({
    where: { id: { in: facturacionIds } },
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  const cobros = await Promise.all(
    facturaciones.map((f) =>
      prisma.cobro.create({
        data: {
          tipo: 'ACTIVACIONES',
          empresaId: f.empresaId,
          anio: f.anio,
          mes: f.mes,
          montoSinIva: f.totalSinIva,
          iva: f.iva,
          montoConIva: f.totalConIva,
          moneda: 'UYU',
          estado: 'FACTURADO',
          facturacionMensualId: f.id,
        },
      })
    )
  )

  return NextResponse.json({ ok: true, created: cobros.length }, { status: 201 })
}
