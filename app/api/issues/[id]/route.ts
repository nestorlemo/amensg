import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseIssueBody, serializeIssue } from '@/lib/issues'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const issue = await prisma.issue.findUnique({
    where: { id, eliminado: false },
    include: { empresa: { select: { id: true, nombre: true } } },
  })
  if (!issue) return NextResponse.json({ error: 'NOT_FOUND', message: 'Issue no encontrado.' }, { status: 404 })

  return NextResponse.json(serializeIssue(issue))
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const existing = await prisma.issue.findUnique({ where: { id, eliminado: false } })
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND', message: 'Issue no encontrado.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const parsed = parseIssueBody(body)
  if ('error' in parsed) return NextResponse.json(parsed.error, { status: 422 })

  const updated = await prisma.issue.update({
    where: { id },
    data: parsed.data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Issue',
      entidadId: id,
      accion: 'EDITAR_ISSUE',
      detalle: {
        descripcion: updated.descripcion,
        empresa: updated.empresa.nombre,
        estado: updated.estado,
      },
    },
  })

  return NextResponse.json(serializeIssue(updated))
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await params
  const hasFactura = await prisma.facturaIssue.findFirst({ where: { issueId: id } })
  if (hasFactura) return NextResponse.json({ message: 'No se puede eliminar un issue facturado.' }, { status: 409 })

  const issue = await prisma.issue.findUnique({ where: { id }, select: { descripcion: true, empresa: { select: { nombre: true } } } })
  await prisma.issue.update({ where: { id }, data: { eliminado: true } })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Issue',
      entidadId: id,
      accion: 'ELIMINAR_ISSUE',
      detalle: {
        descripcion: issue?.descripcion,
        empresa: issue?.empresa?.nombre,
      },
    },
  })

  return NextResponse.json({ ok: true })
}
