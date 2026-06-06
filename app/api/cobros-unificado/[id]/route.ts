import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.estado !== undefined) data.estado = body.estado
  if (body.fechaCobro !== undefined) data.fechaCobro = body.fechaCobro ? new Date(body.fechaCobro) : null
  if (body.urlPdfFactura !== undefined) data.urlPdfFactura = body.urlPdfFactura
  const updated = await prisma.cobro.update({ where: { id }, data })
  return NextResponse.json({ ok: true, id: updated.id })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await params
  await prisma.cobro.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
