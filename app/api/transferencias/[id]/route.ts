import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (body.estado !== undefined) data.estado = body.estado
  if (body.fecha !== undefined) data.fecha = body.fecha ? new Date(body.fecha as string) : null

  const updated = await prisma.transferencia.update({ where: { id }, data })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Transferencia',
      entidadId: id,
      accion: 'MARCAR_TRANSFERIDO',
      detalle: { estado: updated.estado, fecha: updated.fecha?.toISOString() ?? null },
    },
  })

  return NextResponse.json({ ok: true, id: updated.id })
}
