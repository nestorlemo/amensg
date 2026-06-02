import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseIssueBody, serializeIssue } from '../route'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { empresa: { select: { id: true, nombre: true } } },
  })
  if (!issue) return NextResponse.json({ error: 'NOT_FOUND', message: 'Issue no encontrado.' }, { status: 404 })

  return NextResponse.json(serializeIssue(issue))
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const existing = await prisma.issue.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND', message: 'Issue no encontrado.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const parsed = parseIssueBody(body)
  if ('error' in parsed) return NextResponse.json(parsed.error, { status: 422 })

  // Auto-set fechaProduccion when transitioning to EN_PRODUCCION
  if (parsed.data.estado === 'EN_PRODUCCION' && !existing.fechaProduccion) {
    parsed.data.fechaProduccion = parsed.data.fechaProduccion ?? new Date()
  }

  const updated = await prisma.issue.update({
    where: { id },
    data: parsed.data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(serializeIssue(updated))
}
