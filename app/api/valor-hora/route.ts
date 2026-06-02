import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const historial = await prisma.valorHoraDesarrollo.findMany({
    orderBy: { vigenciaDesde: 'desc' },
  })

  const actual = historial[0] ?? null

  return NextResponse.json({
    actual: actual ? serialize(actual) : null,
    historial: historial.map(serialize),
  })
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const valorUSD = Number(body.valorUSD)
  if (!valorUSD || valorUSD <= 0) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'El valor en USD debe ser mayor a 0.' }, { status: 422 })
  }

  const vigenciaDesde = body.vigenciaDesde ? new Date(body.vigenciaDesde as string) : new Date()
  if (isNaN(vigenciaDesde.getTime())) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Fecha de vigencia inválida.' }, { status: 422 })
  }

  const created = await prisma.valorHoraDesarrollo.create({
    data: { valorUSD, vigenciaDesde },
  })

  return NextResponse.json(serialize(created), { status: 201 })
}

function serialize(v: { id: string; valorUSD: { toString(): string }; vigenciaDesde: Date; creadoEn: Date }) {
  return {
    id: v.id,
    valorUSD: Number(v.valorUSD),
    vigenciaDesde: v.vigenciaDesde.toISOString().split('T')[0],
    creadoEn: v.creadoEn.toISOString(),
  }
}
