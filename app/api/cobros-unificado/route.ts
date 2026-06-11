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

  const [data, total, allRows, tipoCambioParam] = await Promise.all([
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
    prisma.cobro.findMany({
      where,
      select: { montoSinIva: true, iva: true, montoConIva: true, moneda: true, estado: true },
    }),
    prisma.parametro.findUnique({ where: { clave: 'tipo_cambio_usd' }, select: { valor: true } }),
  ])

  const tipoCambio = tipoCambioParam ? Number(tipoCambioParam.valor) : 1

  // Totals across all rows matching current filters (for table footer)
  let totSinIvaPendiente = 0, totSinIvaCobrado = 0
  let totIva = 0
  let totConIvaPendiente = 0, totConIvaCobrado = 0
  for (const r of allRows) {
    const tc = r.moneda === 'USD' ? tipoCambio : 1
    const sinIva = Number(r.montoSinIva) * tc
    const ivaAmt = Number(r.iva) * tc
    const conIva = Number(r.montoConIva) * tc
    totIva += ivaAmt
    if (r.estado === 'COBRADO') {
      totSinIvaCobrado += sinIva
      totConIvaCobrado += conIva
    } else {
      totSinIvaPendiente += sinIva
      totConIvaPendiente += conIva
    }
  }

  return NextResponse.json({
    data: data.map((r) => {
      const facturaciones = r.cobroFacturaciones.map((cf) => ({
        id:          cf.facturacionMensual.id,
        empresaId:   cf.facturacionMensual.empresa.id,
        empresa:     cf.facturacionMensual.empresa.nombre,
        totalSinIva: cf.facturacionMensual.totalSinIva.toString(),
        iva:         cf.facturacionMensual.iva.toString(),
        totalConIva: cf.facturacionMensual.totalConIva.toString(),
        urlPdfFactura: cf.facturacionMensual.urlPdfFactura ?? null,
      }))

      // Deduplicate empresa list
      const empresasMap = new Map<string, { id: string; nombre: string }>()
      if (facturaciones.length > 0) {
        for (const f of facturaciones) empresasMap.set(f.empresaId, { id: f.empresaId, nombre: f.empresa })
      } else {
        empresasMap.set(r.empresaId, { id: r.empresaId, nombre: r.empresa?.nombre ?? '' })
      }
      const empresas = [...empresasMap.values()]

      // Amounts: sum from facturaciones when available, else from cobro fields
      const montoSinIva = facturaciones.length > 0
        ? facturaciones.reduce((s, f) => s + Number(f.totalSinIva), 0).toFixed(2)
        : r.montoSinIva.toString()
      const iva = facturaciones.length > 0
        ? facturaciones.reduce((s, f) => s + Number(f.iva), 0).toFixed(2)
        : r.iva.toString()
      const montoConIva = facturaciones.length > 0
        ? facturaciones.reduce((s, f) => s + Number(f.totalConIva), 0).toFixed(2)
        : r.montoConIva.toString()

      // PDF from FacturacionMensual takes precedence over legacy Cobro field
      const facturacionMensualId = facturaciones[0]?.id ?? null
      const urlPdfFactura =
        facturaciones[0]?.urlPdfFactura ?? r.urlPdfFactura ?? null

      return {
        id: r.id,
        tipo: r.tipo,
        empresa: r.empresa?.nombre ?? empresas[0]?.nombre ?? '',
        empresaId: r.empresaId,
        empresas,
        anio: r.anio,
        mes: r.mes,
        montoSinIva,
        iva,
        montoConIva,
        moneda: r.moneda,
        estado: r.estado,
        fechaCobro: r.fechaCobro?.toISOString() ?? null,
        urlPdfFactura,
        facturacionMensualId,
      }
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totals: {
      sinIvaPendiente: totSinIvaPendiente.toFixed(2),
      sinIvaCobrado: totSinIvaCobrado.toFixed(2),
      iva: totIva.toFixed(2),
      conIvaPendiente: totConIvaPendiente.toFixed(2),
      conIvaCobrado: totConIvaCobrado.toFixed(2),
    },
  })
}
