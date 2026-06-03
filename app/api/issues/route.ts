import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { parseIssueBody, serializeIssue } from '@/lib/issues'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const estado     = searchParams.get('estado')     ?? undefined
  const estadoIn   = searchParams.getAll('estadoIn')
  const empresaId  = searchParams.get('empresaId')  ?? undefined
  const prioridad  = searchParams.get('prioridad')  ?? undefined
  const fechaDesde = searchParams.get('fechaDesde') ?? undefined
  const fechaHasta = searchParams.get('fechaHasta') ?? undefined

  const where: Record<string, unknown> = {}
  if (estadoIn.length > 0) where.estado = { in: estadoIn }
  else if (estado) where.estado = estado
  if (empresaId) where.empresaId = empresaId
  if (prioridad) where.prioridad = prioridad
  if (fechaDesde || fechaHasta) {
    const range: Record<string, Date> = {}
    if (fechaDesde) range.gte = new Date(fechaDesde)
    if (fechaHasta) {
      const hasta = new Date(fechaHasta)
      hasta.setDate(hasta.getDate() + 1)
      range.lt = hasta
    }
    where.fechaProduccion = range
  }

  const includeFacturado = searchParams.get('includeFacturado') === 'true'

  const issues = await prisma.issue.findMany({
    where,
    include: {
      empresa: { select: { id: true, nombre: true } },
      ...(includeFacturado ? { facturaIssues: { select: { facturaId: true } } } : {}),
    },
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
  })

  return NextResponse.json({
    issues: issues.map((issue) => ({
      ...serializeIssue(issue),
      ...(includeFacturado && 'facturaIssues' in issue
        ? { facturado: (issue.facturaIssues as { facturaId: string }[]).length > 0 }
        : {}),
    })),
  })
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const parsed = parseIssueBody(body)
  if ('error' in parsed) return NextResponse.json(parsed.error, { status: 422 })

  const issue = await prisma.issue.create({
    data: parsed.data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(serializeIssue(issue), { status: 201 })
}
