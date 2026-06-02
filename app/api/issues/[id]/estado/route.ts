import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeIssue } from '../../route'

export const runtime = 'nodejs'

const ESTADOS_VALIDOS = new Set(['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO', 'NO_HACER', 'FACTURADO', 'COBRADO'])

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const existing = await prisma.issue.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND', message: 'Issue no encontrado.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const estado = typeof body.estado === 'string' ? body.estado : ''
  if (!ESTADOS_VALIDOS.has(estado)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Estado inválido.' }, { status: 422 })
  }

  const data: Record<string, unknown> = { estado }
  if (estado === 'EN_PRODUCCION' && !existing.fechaProduccion) {
    data.fechaProduccion = new Date()
  }

  const updated = await prisma.issue.update({
    where: { id },
    data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(serializeIssue(updated))
}
