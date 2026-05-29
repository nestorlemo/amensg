import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const motivo = typeof body?.motivo === 'string' ? body.motivo.trim() : ''

  if (!motivo) {
    return NextResponse.json(
      {
        error: 'MOTIVO_REQUERIDO',
        message: 'Debe indicar un motivo para reabrir el cierre.',
      },
      { status: 422 },
    )
  }

  const cierre = await prisma.cierreMensual.findUnique({
    where: { id },
    select: {
      id: true,
      anio: true,
      mes: true,
      estado: true,
    },
  })

  if (!cierre) {
    return NextResponse.json(
      {
        error: 'NOT_FOUND',
        message: 'No se encontró el cierre mensual.',
      },
      { status: 404 },
    )
  }

  if (normalizeEstado(cierre.estado) === 'REABIERTO') {
    return NextResponse.json(
      {
        error: 'CIERRE_YA_REABIERTO',
        message: 'El cierre mensual ya fue reabierto.',
      },
      { status: 422 },
    )
  }

  if (normalizeEstado(cierre.estado) !== 'CERRADO') {
    return NextResponse.json(
      {
        error: 'ESTADO_INVALIDO',
        message: 'Solo se pueden reabrir cierres en estado CERRADO.',
      },
      { status: 422 },
    )
  }

  const now = new Date()
  const actualizado = await prisma.$transaction(async (tx) => {
    const cierreActualizado = await tx.cierreMensual.update({
      where: { id },
      data: {
        estado: 'REABIERTO',
        reabiertoAt: now,
        motivoReapertura: motivo,
      },
    })

    await tx.auditoria.create({
      data: {
        entidad: 'CierreMensual',
        usuarioId: auth.user.id,
        entidadId: id,
        accion: 'REABRIR_CIERRE_MENSUAL',
        detalle: {
          anio: cierre.anio,
          mes: cierre.mes,
          estadoAnterior: cierre.estado,
          estadoNuevo: 'REABIERTO',
          motivo,
          reabiertoAt: now.toISOString(),
        },
      },
    })

    return cierreActualizado
  })

  return NextResponse.json({
    id: actualizado.id,
    anio: actualizado.anio,
    mes: actualizado.mes,
    estado: actualizado.estado,
    reabiertoAt: actualizado.reabiertoAt?.toISOString() ?? null,
    motivoReapertura: actualizado.motivoReapertura,
  })
}

function normalizeEstado(value: string) {
  return value.trim().toUpperCase()
}
