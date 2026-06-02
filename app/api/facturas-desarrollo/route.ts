import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const IVA = 0.22

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const anio      = searchParams.get('anio')      ? parseInt(searchParams.get('anio')!) : undefined
  const mes       = searchParams.get('mes')       ? parseInt(searchParams.get('mes')!)  : undefined
  const empresaId = searchParams.get('empresaId') ?? undefined

  const where: Record<string, unknown> = {}
  if (anio)      where.anio      = anio
  if (mes)       where.mes       = mes
  if (empresaId) where.empresaId = empresaId

  const facturas = await prisma.facturaDesarrollo.findMany({
    where,
    include: {
      empresa: { select: { id: true, nombre: true } },
      distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
      facturaIssues: { include: { issue: true } },
    },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadoEn: 'desc' }],
  })

  return NextResponse.json({ facturas: facturas.map(serializeFactura) })
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const anio      = parseInt(String(body.anio ?? ''), 10)
  const mes       = parseInt(String(body.mes ?? ''), 10)
  const empresaId = typeof body.empresaId === 'string' ? body.empresaId : ''
  const tipoCambio = Number(body.tipoCambio)
  const issueIds = Array.isArray(body.issueIds) ? (body.issueIds as string[]) : []
  const distribuciones = Array.isArray(body.distribuciones)
    ? (body.distribuciones as { socioId: string; porcentaje: number }[])
    : []

  if (!anio || !mes) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Año y mes son requeridos.' }, { status: 422 })
  if (!empresaId)    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Empresa es requerida.' }, { status: 422 })
  if (!tipoCambio || tipoCambio <= 0) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Tipo de cambio inválido.' }, { status: 422 })
  if (issueIds.length === 0) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Debe seleccionar al menos un issue.' }, { status: 422 })

  // Read valor hora from parametros
  const valorHoraParam = await prisma.parametro.findUnique({ where: { clave: 'valor_hora_desarrollo_usd' } })
  const valorHoraUSD = valorHoraParam ? Number(valorHoraParam.valor) : 0
  if (!valorHoraUSD || valorHoraUSD <= 0) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'El parámetro valor_hora_desarrollo_usd no está configurado. Configuralo en Parámetros.' }, { status: 422 })

  const totalPct = distribuciones.reduce((s, d) => s + d.porcentaje, 0)
  if (distribuciones.length > 0 && Math.abs(totalPct - 100) > 0.01) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Los porcentajes de distribución deben sumar 100%.' }, { status: 422 })
  }

  // Get issues and calc hours
  const issues = await prisma.issue.findMany({ where: { id: { in: issueIds } } })
  const totalHoras = issues.reduce((s, i) => s + Number(i.totalHoras), 0)
  const totalUSD   = Math.round(totalHoras * valorHoraUSD * 100) / 100
  const totalUYU   = Math.round(totalUSD * tipoCambio * 100) / 100
  const iva        = Math.round(totalUYU * IVA * 100) / 100
  const totalConIva = Math.round((totalUYU + iva) * 100) / 100

  // Build ingreso adicional data
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nombre: true } })
  const mesStr = String(mes).padStart(2, '0')
  const concepto = `Desarrollo ${empresa?.nombre ?? ''} ${mesStr}/${anio}`

  const factura = await prisma.$transaction(async (tx) => {
    // Create IngresoAdicional
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

    // Create FacturaDesarrollo
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
            montoUYU: Math.round(totalConIva * (d.porcentaje / 100) * 100) / 100,
          })),
        } : undefined,
      },
      include: {
        empresa: { select: { id: true, nombre: true } },
        distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
        facturaIssues: { include: { issue: true } },
      },
    })

    return fd
  })

  return NextResponse.json(serializeFactura(factura), { status: 201 })
}

export function serializeFactura(f: {
  id: string; anio: number; mes: number; creadoEn: Date
  totalHoras: { toString(): string }; valorHoraUSD: { toString(): string }
  totalUSD: { toString(): string }; tipoCambio: { toString(): string }
  totalUYU: { toString(): string }; iva: { toString(): string }; totalConIva: { toString(): string }
  ingresoAdicionalId: string | null
  empresa: { id: string; nombre: string }
  distribuciones: { id: string; porcentaje: { toString(): string }; montoUYU: { toString(): string }; socio: { id: string; nombre: string } }[]
  facturaIssues: { issue: { id: string; descripcion: string; totalHoras: { toString(): string } } }[]
}) {
  return {
    id: f.id,
    anio: f.anio,
    mes: f.mes,
    empresa: f.empresa,
    totalHoras: Number(f.totalHoras),
    valorHoraUSD: Number(f.valorHoraUSD),
    totalUSD: Number(f.totalUSD),
    tipoCambio: Number(f.tipoCambio),
    totalUYU: Number(f.totalUYU),
    iva: Number(f.iva),
    totalConIva: Number(f.totalConIva),
    ingresoAdicionalId: f.ingresoAdicionalId,
    creadoEn: f.creadoEn.toISOString(),
    distribuciones: f.distribuciones.map((d) => ({
      id: d.id,
      socio: d.socio,
      porcentaje: Number(d.porcentaje),
      montoUYU: Number(d.montoUYU),
    })),
    issues: f.facturaIssues.map((fi) => ({
      id: fi.issue.id,
      descripcion: fi.issue.descripcion,
      totalHoras: Number(fi.issue.totalHoras),
    })),
  }
}
