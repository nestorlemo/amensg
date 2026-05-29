import { NextResponse } from 'next/server'

import { notFoundError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { closedPeriodError, isPeriodClosed } from '@/lib/periods'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const STATES_REQUIRING_PAYMENT_DATE = new Set(['PAGADO', 'CONTADO', 'CHEQUE'])
const STATES_ALLOWING_NULL_PAYMENT_DATE = new Set(['PENDIENTE', 'ENVIADO', 'ANULADO'])
const SUPPORTED_STATES = new Set([...STATES_REQUIRING_PAYMENT_DATE, ...STATES_ALLOWING_NULL_PAYMENT_DATE])

type RouteContext = {
  params: Promise<{ id: string }>
}

type ChangeEstadoCobroRequest = {
  estadoCobroId?: unknown
  fechaCobro?: unknown
  observaciones?: unknown
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const body = (await request.json().catch(() => null)) as ChangeEstadoCobroRequest | null

  if (!body || typeof body.estadoCobroId !== 'string' || !body.estadoCobroId.trim()) {
    return NextResponse.json(
      {
        error: 'ESTADO_COBRO_REQUERIDO',
        message: 'Debe enviar estadoCobroId.',
      },
      { status: 400 },
    )
  }

  const estadoCobroId = body.estadoCobroId.trim()
  const observaciones = typeof body.observaciones === 'string' ? body.observaciones.trim() || null : null
  const fechaCobroResult = parsePaymentDate(body.fechaCobro)

  if ('error' in fechaCobroResult) {
    return NextResponse.json(fechaCobroResult.error, { status: 400 })
  }

  const facturacion = await prisma.facturacionMensual.findUnique({
    where: { id },
    include: {
      estadoCobro: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      },
    },
  })

  if (!facturacion) {
    return notFoundError('No se encontró la facturación.')
  }

  if (await isPeriodClosed(facturacion.anio, facturacion.mes)) {
    return NextResponse.json(
      closedPeriodError('El período ya está cerrado. No se puede modificar el estado de cobro.'),
      { status: 409 },
    )
  }

  const nextEstado = await prisma.estadoCobro.findUnique({
    where: { id: estadoCobroId },
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  })

  if (!nextEstado) {
    return notFoundError('No se encontró el estado de cobro.')
  }

  if (!SUPPORTED_STATES.has(nextEstado.codigo)) {
    return NextResponse.json(
      {
        error: 'ESTADO_COBRO_INVALIDO',
        message: `Estado de cobro no soportado: ${nextEstado.codigo}.`,
      },
      { status: 422 },
    )
  }

  if (STATES_REQUIRING_PAYMENT_DATE.has(nextEstado.codigo) && !fechaCobroResult.fechaCobro) {
    return NextResponse.json(
      {
        error: 'FECHA_COBRO_REQUERIDA',
        message: `El estado ${nextEstado.codigo} requiere fechaCobro.`,
      },
      { status: 422 },
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedFacturacion = await tx.facturacionMensual.update({
      where: { id },
      data: {
        estadoCobroId: nextEstado.id,
        fechaCobro: fechaCobroResult.fechaCobro,
        observaciones,
      },
      include: {
        estadoCobro: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    })

    await tx.auditoria.create({
      data: {
        entidad: 'FacturacionMensual',
        usuarioId: auth.user.id,
        entidadId: id,
        accion: 'CAMBIAR_ESTADO_COBRO',
        detalle: {
          estadoAnterior: {
            id: facturacion.estadoCobro.id,
            codigo: facturacion.estadoCobro.codigo,
          },
          estadoNuevo: {
            id: nextEstado.id,
            codigo: nextEstado.codigo,
          },
          fechaCobroAnterior: facturacion.fechaCobro?.toISOString() ?? null,
          fechaCobroNueva: updatedFacturacion.fechaCobro?.toISOString() ?? null,
          observaciones,
        },
      },
    })

    return updatedFacturacion
  })

  return NextResponse.json({
    id: updated.id,
    estadoCobroId: updated.estadoCobroId,
    estadoCobro: updated.estadoCobro.codigo,
    fechaCobro: updated.fechaCobro?.toISOString() ?? null,
    observaciones: updated.observaciones,
  })
}

function parsePaymentDate(value: unknown): { fechaCobro: Date | null } | { error: { error: string; message: string } } {
  if (value === undefined || value === null || value === '') {
    return { fechaCobro: null }
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      error: {
        error: 'FECHA_COBRO_INVALIDA',
        message: 'fechaCobro debe tener formato YYYY-MM-DD.',
      },
    }
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return {
      error: {
        error: 'FECHA_COBRO_INVALIDA',
        message: 'fechaCobro debe ser una fecha calendario valida.',
      },
    }
  }

  return { fechaCobro: date }
}
