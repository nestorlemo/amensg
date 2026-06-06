import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const tipo      = searchParams.get('tipo')      ?? undefined
  const empresaId = searchParams.get('empresaId') ?? undefined
  const anio      = searchParams.get('anio')      ? parseInt(searchParams.get('anio')!) : undefined
  const mes       = searchParams.get('mes')       ? parseInt(searchParams.get('mes')!)  : undefined
  const estado    = searchParams.get('estado')    ?? undefined
  const page      = parseInt(searchParams.get('page') ?? '1')
  const pageSize  = 50

  const where: Record<string, unknown> = {}
  if (tipo)      where.tipo      = tipo
  if (empresaId) where.empresaId = empresaId
  if (anio)      where.anio      = anio
  if (mes)       where.mes       = mes
  if (estado)    where.estado    = estado

  const [data, total] = await Promise.all([
    prisma.cobro.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        cobroFacturaciones: {
          include: {
            facturacionMensual: {
              include: { empresa: { select: { id: true, nombre: true } } },
            },
          },
        },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadoEn: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cobro.count({ where }),
  ])

  const now = new Date()
  const [totalPendiente, cobradoEsteMes, pendienteCount, empresasDeuda] = await Promise.all([
    prisma.cobro.aggregate({ where: { estado: 'FACTURADO', moneda: 'UYU' }, _sum: { montoConIva: true } }),
    prisma.cobro.aggregate({ where: { estado: 'COBRADO', anio: now.getFullYear(), mes: now.getMonth() + 1, moneda: 'UYU' }, _sum: { montoConIva: true } }),
    prisma.cobro.count({ where: { estado: 'FACTURADO' } }),
    prisma.cobro.groupBy({ by: ['empresaId'], where: { estado: 'FACTURADO' } }),
  ])

  return NextResponse.json({
    data: data.map((r) => {
      // For ACTIVACIONES: derive companies from cobroFacturaciones; else use empresa field
      const empresas = r.cobroFacturaciones.length > 0
        ? r.cobroFacturaciones.map((cf) => ({
            id: cf.facturacionMensual.empresa.id,
            nombre: cf.facturacionMensual.empresa.nombre,
          }))
        : [{ id: r.empresaId, nombre: r.empresa?.nombre ?? '' }]

      // Deduplicate
      const empresasMap = new Map(empresas.map((e) => [e.id, e]))
      const empresasUnicas = [...empresasMap.values()]

      return {
        id: r.id,
        tipo: r.tipo,
        empresa: r.empresa?.nombre ?? empresasUnicas[0]?.nombre ?? '',
        empresaId: r.empresaId,
        empresas: empresasUnicas,
        anio: r.anio,
        mes: r.mes,
        montoSinIva: r.montoSinIva.toString(),
        iva: r.iva.toString(),
        montoConIva: r.montoConIva.toString(),
        moneda: r.moneda,
        estado: r.estado,
        fechaCobro: r.fechaCobro?.toISOString() ?? null,
        urlPdfFactura: r.urlPdfFactura ?? null,
      }
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    kpis: {
      totalPendienteUYU: totalPendiente._sum.montoConIva?.toString() ?? '0',
      cobradoEsteMesUYU: cobradoEsteMes._sum.montoConIva?.toString() ?? '0',
      pendienteCount,
      empresasConDeuda: empresasDeuda.length,
    },
  })
}
