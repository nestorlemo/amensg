import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeIssue } from '@/lib/issues'

export const runtime = 'nodejs'

const ESTADOS_VALIDOS = new Set(['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO'])

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const existing = await prisma.issue.findUnique({ where: { id, eliminado: false } })
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND', message: 'Issue no encontrado.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const estado = typeof body.estado === 'string' ? body.estado : ''
  if (!ESTADOS_VALIDOS.has(estado)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Estado inválido.' }, { status: 422 })
  }

  if (estado === 'CANCELADO') {
    const motivo = typeof body.motivoCancelacion === 'string' ? body.motivoCancelacion.trim() : ''
    if (!motivo) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'El motivo de cancelación es requerido.' }, { status: 422 })
    }
  }

  if (estado === 'EN_PRODUCCION') {
    const fp = typeof body.fechaProduccion === 'string' ? body.fechaProduccion.trim() : ''
    if (!fp) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'La fecha en producción es requerida.' }, { status: 422 })
    }
    const fecha = new Date(fp)
    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Fecha en producción inválida.' }, { status: 422 })
    }
  }

  const data: Record<string, unknown> = {
    estado,
    fechaProduccion: estado === 'EN_PRODUCCION' ? new Date(body.fechaProduccion as string) : null,
    motivoCancelacion: estado === 'CANCELADO' ? (body.motivoCancelacion as string).trim() : null,
  }

  const updated = await prisma.issue.update({
    where: { id },
    data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(serializeIssue(updated))
}
