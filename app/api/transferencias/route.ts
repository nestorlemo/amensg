import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function concepto(tipo: string, anio: number, mes: number, empresaNombre: string) {
  const mesNombre = MESES[mes - 1] ?? ''
  if (tipo === 'ACTIVACIONES') return `Activaciones ${mesNombre} ${anio}`
  if (tipo === 'DESARROLLO') return `Desarrollo ${mesNombre} ${anio} - ${empresaNombre}`
  return `${tipo} ${mesNombre} ${anio}`
}

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const socioId = searchParams.get('socioId') ?? undefined
  const estado  = searchParams.get('estado')  ?? undefined
  const moneda  = searchParams.get('moneda')  ?? undefined
  const anio    = searchParams.get('anio')    ? parseInt(searchParams.get('anio')!)    : undefined
  const mes     = searchParams.get('mes')     ? parseInt(searchParams.get('mes')!)     : undefined

  const where: Record<string, unknown> = {}
  if (socioId) where.socioId = socioId
  if (estado)  where.estado  = estado
  if (moneda)  where.moneda  = moneda
  if (anio || mes) {
    where.cobro = {
      ...(anio ? { anio } : {}),
      ...(mes  ? { mes  } : {}),
    }
  }

  const transferencias = await prisma.transferencia.findMany({
    where,
    include: {
      socio: { select: { id: true, nombre: true } },
      cobro: { select: { id: true, tipo: true, anio: true, mes: true, empresa: { select: { nombre: true } } } },
    },
    orderBy: [{ cobro: { anio: 'desc' } }, { cobro: { mes: 'desc' } }, { socio: { nombre: 'asc' } }],
  })

  return NextResponse.json({
    transferencias: transferencias.map((t) => ({
      id: t.id,
      socioId: t.socioId,
      socio: t.socio.nombre,
      cobroId: t.cobroId,
      cobroTipo: t.cobro.tipo,
      cobroAnio: t.cobro.anio,
      cobroMes: t.cobro.mes,
      empresa: t.cobro.empresa.nombre,
      moneda: t.moneda,
      monto: t.monto.toString(),
      cuentaDestino: t.cuentaDestino,
      fecha: t.fecha?.toISOString() ?? null,
      estado: t.estado,
      concepto: t.concepto,
      creadoEn: t.creadoEn.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const cobroId = typeof body.cobroId === 'string' ? body.cobroId : ''
  if (!cobroId) return NextResponse.json({ error: 'cobroId es requerido.' }, { status: 422 })

  // Check if transferencias already exist for this cobro
  const existing = await prisma.transferencia.count({ where: { cobroId } })
  if (existing > 0) return NextResponse.json({ error: 'Ya existen transferencias para este cobro.' }, { status: 409 })

  const cobro = await prisma.cobro.findUnique({
    where: { id: cobroId },
    include: {
      empresa: { select: { nombre: true } },
      facturaDesarrollo: { include: { distribuciones: { include: { socio: true } } } },
    },
  })
  if (!cobro) return NextResponse.json({ error: 'Cobro no encontrado.' }, { status: 404 })

  const conceptoStr = concepto(cobro.tipo, cobro.anio, cobro.mes, cobro.empresa.nombre)

  type TransferenciaInput = {
    socioId: string
    cobroId: string
    moneda: string
    monto: number
    cuentaDestino: string | null
    concepto: string
    estado: string
  }

  const transferenciasData: TransferenciaInput[] = []

  if (cobro.tipo === 'DESARROLLO' && cobro.facturaDesarrollo?.distribuciones?.length) {
    for (const dist of cobro.facturaDesarrollo.distribuciones) {
      const cuentas = dist.socio.cuentas as Record<string, string> | null
      const cuentaDestino = cobro.moneda === 'USD'
        ? (cuentas?.usd ?? cuentas?.USD ?? null)
        : (cuentas?.pesos ?? cuentas?.UYU ?? null)
      transferenciasData.push({
        socioId: dist.socioId,
        cobroId,
        moneda: cobro.moneda,
        monto: Number(dist.montoUYU),
        cuentaDestino: cuentaDestino ?? null,
        concepto: conceptoStr,
        estado: 'PENDIENTE',
      })
    }
  } else {
    // ACTIVACIONES or ADICIONAL: distribute by socios activos porcentaje
    const socios = await prisma.socio.findMany({
      where: { activo: true },
      select: { id: true, porcentajeParticipacion: true, cuentas: true },
    })
    const montoBase = Number(cobro.montoSinIva)
    for (const socio of socios) {
      const pct = Number(socio.porcentajeParticipacion)
      if (pct <= 0) continue
      const monto = Math.round(montoBase * (pct / 100) * 100) / 100
      const cuentas = socio.cuentas as Record<string, string> | null
      const cuentaDestino = cobro.moneda === 'USD'
        ? (cuentas?.usd ?? cuentas?.USD ?? null)
        : (cuentas?.pesos ?? cuentas?.UYU ?? null)
      transferenciasData.push({
        socioId: socio.id,
        cobroId,
        moneda: cobro.moneda,
        monto,
        cuentaDestino: cuentaDestino ?? null,
        concepto: conceptoStr,
        estado: 'PENDIENTE',
      })
    }
  }

  if (transferenciasData.length === 0) {
    return NextResponse.json({ error: 'No se encontraron socios o distribuciones para este cobro.' }, { status: 422 })
  }

  await prisma.transferencia.createMany({ data: transferenciasData })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Transferencia',
      entidadId: cobroId,
      accion: 'GENERAR_TRANSFERENCIAS',
      detalle: { cobroId, tipo: cobro.tipo, cantidad: transferenciasData.length },
    },
  })

  return NextResponse.json({ ok: true, created: transferenciasData.length }, { status: 201 })
}
