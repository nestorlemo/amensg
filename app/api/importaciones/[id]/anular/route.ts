import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { closedPeriodError, isPeriodClosed } from '@/lib/periods'
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
        message: 'Debe indicar un motivo para anular la importación.',
      },
      { status: 422 },
    )
  }

  const importacion = await prisma.importacionActivacion.findUnique({
    where: { id },
    include: {
      facturaciones: {
        select: {
          id: true,
          estadoCobro: {
            select: {
              codigo: true,
            },
          },
        },
      },
    },
  })

  if (!importacion) {
    return NextResponse.json(
      {
        error: 'NOT_FOUND',
        message: 'No se encontró la importación.',
      },
      { status: 404 },
    )
  }

  if (normalizeEstado(importacion.estado) === 'ANULADA') {
    return NextResponse.json(
      {
        error: 'IMPORTACION_YA_ANULADA',
        message: 'La importación ya está anulada.',
      },
      { status: 422 },
    )
  }

  if (await isPeriodClosed(importacion.anio, importacion.mes)) {
    return NextResponse.json(
      closedPeriodError('El período ya está cerrado. No se puede anular la importación.'),
      { status: 409 },
    )
  }

  const estadoAnulado = await prisma.estadoCobro.findUnique({
    where: { codigo: 'ANULADO' },
    select: { id: true },
  })

  if (!estadoAnulado) {
    return NextResponse.json(
      {
        error: 'ESTADO_COBRO_REQUERIDO',
        message: 'No existe el estado de cobro ANULADO.',
      },
      { status: 422 },
    )
  }

  const now = new Date()
  const result = await prisma.$transaction(async (tx) => {
    const updatedImportacion = await tx.importacionActivacion.update({
      where: { id },
      data: {
        estado: 'ANULADA',
        anuladaEn: now,
        motivoAnulacion: motivo,
      },
    })

    await tx.facturacionMensual.updateMany({
      where: { importacionId: id },
      data: {
        estadoCobroId: estadoAnulado.id,
        fechaCobro: null,
        observaciones: motivo,
      },
    })

    await tx.auditoria.create({
      data: {
        entidad: 'ImportacionActivacion',
        usuarioId: auth.user.id,
        entidadId: id,
        accion: 'ANULAR_IMPORTACION',
        detalle: {
          anio: importacion.anio,
          mes: importacion.mes,
          estadoAnterior: importacion.estado,
          estadoNuevo: 'ANULADA',
          motivo,
          anuladaEn: now.toISOString(),
          facturacionesAnuladas: importacion.facturaciones.length,
        },
      },
    })

    return updatedImportacion
  })

  return NextResponse.json({
    id: result.id,
    anio: result.anio,
    mes: result.mes,
    estado: result.estado,
    anuladaEn: result.anuladaEn?.toISOString() ?? null,
    motivoAnulacion: result.motivoAnulacion,
  })
}

function normalizeEstado(value: string) {
  return value.trim().toUpperCase()
}
