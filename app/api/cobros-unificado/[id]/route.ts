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

  const cobro = await prisma.cobro.findUnique({
    where: { id },
    select: { tipo: true, montoConIva: true, moneda: true, empresa: { select: { nombre: true } } },
  })
  const updated = await prisma.cobro.update({ where: { id }, data })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Cobro',
      entidadId: id,
      accion: 'MARCAR_COBRADO',
      detalle: {
        tipo: cobro?.tipo,
        empresa: cobro?.empresa?.nombre,
        montoConIva: cobro?.montoConIva?.toString(),
        moneda: cobro?.moneda,
        fechaCobro: body.fechaCobro ?? null,
      },
    },
  })

  return NextResponse.json({ ok: true, id: updated.id })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await params

  const cobro = await prisma.cobro.findUnique({
    where: { id },
    select: { tipo: true, montoConIva: true, moneda: true, empresa: { select: { nombre: true } } },
  })
  await prisma.cobro.delete({ where: { id } })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Cobro',
      entidadId: id,
      accion: 'ELIMINAR_COBRO',
      detalle: {
        tipo: cobro?.tipo,
        empresa: cobro?.empresa?.nombre,
        montoConIva: cobro?.montoConIva?.toString(),
        moneda: cobro?.moneda,
      },
    },
  })

  return NextResponse.json({ ok: true })
}
