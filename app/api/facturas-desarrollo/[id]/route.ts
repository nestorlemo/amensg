import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeFactura } from '@/lib/issues'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const factura = await prisma.facturaDesarrollo.findUnique({
    where: { id },
    include: {
      empresa: { select: { id: true, nombre: true } },
      distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
      facturaIssues: { include: { issue: true } },
      cobros: { select: { id: true, estado: true, urlPdfFactura: true, fechaCobro: true }, take: 1, orderBy: { creadoEn: 'desc' } },
    },
  })
  if (!factura) return NextResponse.json({ error: 'NOT_FOUND', message: 'Factura no encontrada.' }, { status: 404 })

  return NextResponse.json(serializeFactura(factura))
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const factura = await prisma.facturaDesarrollo.findUnique({ where: { id } })
  if (!factura) return NextResponse.json({ error: 'NOT_FOUND', message: 'Factura no encontrada.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  // If body has estado, update cobro estado (and fechaCobro when marking COBRADO)
  if (typeof body.estado === 'string') {
    const fechaCobro = body.estado === 'COBRADO'
      ? (typeof body.fechaCobro === 'string' && body.fechaCobro ? new Date(body.fechaCobro) : new Date())
      : undefined
    await prisma.cobro.updateMany({
      where: { facturaDesarrolloId: id },
      data: { estado: body.estado, ...(fechaCobro ? { fechaCobro } : {}) },
    })
    const updated = await prisma.facturaDesarrollo.findUniqueOrThrow({
      where: { id },
      include: {
        empresa: { select: { id: true, nombre: true } },
        distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
        facturaIssues: { include: { issue: true } },
        cobros: { select: { id: true, estado: true, urlPdfFactura: true, fechaCobro: true }, take: 1, orderBy: { creadoEn: 'desc' } },
      },
    })
    return NextResponse.json(serializeFactura(updated))
  }

  const distribuciones = Array.isArray(body.distribuciones)
    ? (body.distribuciones as { socioId: string; porcentaje: number }[])
    : []

  const totalPct = distribuciones.reduce((s, d) => s + d.porcentaje, 0)
  if (distribuciones.length > 0 && Math.abs(totalPct - 100) > 0.01) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Los porcentajes deben sumar 100%.' }, { status: 422 })
  }

  const totalConIva = Number(factura.totalConIva)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.distribucionFactura.deleteMany({ where: { facturaId: id } })
    if (distribuciones.length > 0) {
      await tx.distribucionFactura.createMany({
        data: distribuciones.map((d) => ({
          facturaId: id,
          socioId: d.socioId,
          porcentaje: d.porcentaje,
          montoUYU: Math.round(totalConIva * (d.porcentaje / 100) * 100) / 100,
        })),
      })
    }
    return tx.facturaDesarrollo.findUniqueOrThrow({
      where: { id },
      include: {
        empresa: { select: { id: true, nombre: true } },
        distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
        facturaIssues: { include: { issue: true } },
        cobros: { select: { id: true, estado: true, urlPdfFactura: true, fechaCobro: true }, take: 1, orderBy: { creadoEn: 'desc' } },
      },
    })
  })

  return NextResponse.json(serializeFactura(updated))
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const factura = await prisma.facturaDesarrollo.findUnique({ where: { id }, select: { ingresoAdicionalId: true } })
  if (!factura) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.facturaIssue.deleteMany({ where: { facturaId: id } })
    await tx.distribucionFactura.deleteMany({ where: { facturaId: id } })
    await tx.facturaDesarrollo.delete({ where: { id } })
    if (factura.ingresoAdicionalId) {
      await tx.ingresoAdicional.delete({ where: { id: factura.ingresoAdicionalId } })
    }
  })

  return NextResponse.json({ ok: true })
}
