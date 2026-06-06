import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { serializeFactura } from '@/lib/issues'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const IVA = 0.22

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const empresaId          = searchParams.get('empresaId')          ?? undefined
  const ingresoAdicionalId = searchParams.get('ingresoAdicionalId') ?? undefined
  const estado             = searchParams.get('estado')             ?? undefined
  const fechaDesde         = searchParams.get('fechaDesde')         ?? undefined
  const fechaHasta         = searchParams.get('fechaHasta')         ?? undefined

  // When estado=sin_facturar, return issues not yet associated with any FacturaDesarrollo
  if (estado === 'sin_facturar') {
    const issueWhere: Record<string, unknown> = {
      eliminado: false,
      estado: 'EN_PRODUCCION',
      facturaIssues: { none: {} },
    }
    if (empresaId) issueWhere.empresaId = empresaId
    if (fechaDesde || fechaHasta) {
      const range: Record<string, Date> = {}
      if (fechaDesde) range.gte = new Date(fechaDesde)
      if (fechaHasta) {
        const hasta = new Date(fechaHasta)
        hasta.setDate(hasta.getDate() + 1)
        range.lt = hasta
      }
      issueWhere.fechaProduccion = range
    }
    const issues = await prisma.issue.findMany({
      where: issueWhere,
      include: { empresa: { select: { id: true, nombre: true } } },
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    })
    return NextResponse.json({
      issues: issues.map((i) => ({
        id: i.id,
        fecha: i.fechaProduccion?.toISOString().split('T')[0] ?? i.fecha.toISOString().split('T')[0],
        descripcion: i.descripcion,
        totalHoras: Number(i.totalHoras),
        estado: i.estado,
        empresa: i.empresa,
      })),
    })
  }

  const where: Record<string, unknown> = {}
  if (empresaId) where.empresaId = empresaId
  if (ingresoAdicionalId) where.ingresoAdicionalId = ingresoAdicionalId

  const facturas = await prisma.facturaDesarrollo.findMany({
    where,
    include: {
      empresa: { select: { id: true, nombre: true } },
      distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
      facturaIssues: { include: { issue: true } },
      cobros: { select: { id: true, urlPdfFactura: true }, take: 1, orderBy: { creadoEn: 'desc' } },
    },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadoEn: 'desc' }],
  })

  return NextResponse.json({ facturas: facturas.map(serializeFactura) })
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const fechaDesde = typeof body.fechaDesde === 'string' ? body.fechaDesde : ''
  const fechaHasta = typeof body.fechaHasta === 'string' ? body.fechaHasta : ''
  const empresaId  = typeof body.empresaId  === 'string' ? body.empresaId  : ''
  const tipoCambio = Number(body.tipoCambio)
  const issueIds   = Array.isArray(body.issueIds) ? (body.issueIds as string[]) : []
  const distribuciones = Array.isArray(body.distribuciones)
    ? (body.distribuciones as { socioId: string; porcentaje: number }[])
    : []
  const crearCobro = body.crearCobro === true

  if (!fechaDesde || !fechaHasta) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Fecha desde y hasta son requeridas.' }, { status: 422 })
  if (!empresaId)                 return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Empresa es requerida.' }, { status: 422 })
  if (!tipoCambio || tipoCambio <= 0) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Tipo de cambio inválido.' }, { status: 422 })
  if (issueIds.length === 0)      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Debe seleccionar al menos un issue.' }, { status: 422 })

  // Derive anio/mes from fechaDesde for record-keeping
  const [anioStr, mesStr] = fechaDesde.split('-')
  const anio = parseInt(anioStr ?? '', 10)
  const mes  = parseInt(mesStr  ?? '', 10)

  // Read valor hora from parametros
  const valorHoraParam = await prisma.parametro.findUnique({ where: { clave: 'valor_hora_desarrollo_usd' } })
  const valorHoraUSD = valorHoraParam ? Number(valorHoraParam.valor) : 0
  if (!valorHoraUSD || valorHoraUSD <= 0) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'El parámetro valor_hora_desarrollo_usd no está configurado. Configuralo en Parámetros.' }, { status: 422 })

  const totalPct = distribuciones.reduce((s, d) => s + d.porcentaje, 0)
  if (distribuciones.length > 0 && Math.abs(totalPct - 100) > 0.01) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Los porcentajes de distribución deben sumar 100%.' }, { status: 422 })
  }

  // Get issues and calc hours
  const issues = await prisma.issue.findMany({ where: { id: { in: issueIds }, eliminado: false } })
  const totalHoras  = issues.reduce((s, i) => s + Number(i.totalHoras), 0)
  const totalUSD    = Math.round(totalHoras * valorHoraUSD * 100) / 100
  const totalUYU    = Math.round(totalUSD * tipoCambio * 100) / 100
  const iva         = Math.round(totalUYU * IVA * 100) / 100
  const totalConIva = Math.round((totalUYU + iva) * 100) / 100

  // Build ingreso adicional description
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } })
  const concepto = `Desarrollo ${empresa?.nombre ?? ''} ${fechaDesde} / ${fechaHasta}`

  const factura = await prisma.$transaction(async (tx) => {
    const ingreso = await tx.ingresoAdicional.create({
      data: {
        concepto,
        empresaId,
        anio,
        mes,
        moneda: 'USD',
        montoOrigen: totalUSD,
        fechaFacturacion: new Date(),
        tipoCambioAplicado: tipoCambio,
        fuenteTipoCambio: 'MANUAL',
        fechaTipoCambio: new Date(),
        montoSinIva: totalUYU,
        porcentajeIva: IVA,
        iva,
        montoConIva: totalConIva,
      },
    })

    const fd = await tx.facturaDesarrollo.create({
      data: {
        anio,
        mes,
        empresaId,
        totalHoras,
        valorHoraUSD,
        totalUSD,
        tipoCambio,
        totalUYU,
        iva,
        totalConIva,
        ingresoAdicionalId: ingreso.id,
        facturaIssues: {
          create: issueIds.map((issueId) => ({ issueId })),
        },
        distribuciones: distribuciones.length > 0 ? {
          create: distribuciones.map((d) => ({
            socioId: d.socioId,
            porcentaje: d.porcentaje,
            montoUYU: Math.round(totalUSD * (d.porcentaje / 100) * 100) / 100,
          })),
        } : undefined,
      },
      include: {
        empresa: { select: { id: true, nombre: true } },
        distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
        facturaIssues: { include: { issue: true } },
      },
    })

    if (crearCobro) {
      await tx.cobro.create({
        data: {
          tipo: 'DESARROLLO',
          empresaId,
          anio,
          mes,
          montoSinIva: totalUSD,
          iva: Math.round(totalUSD * IVA * 100) / 100,
          montoConIva: Math.round(totalUSD * (1 + IVA) * 100) / 100,
          moneda: 'USD',
          estado: 'FACTURADO',
          facturaDesarrolloId: fd.id,
        },
      })
    }

    return fd
  })

  return NextResponse.json(serializeFactura(factura), { status: 201 })
}
