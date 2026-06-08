import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MESES     = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function mesLabel(mes: number, abrev = false) {
  return abrev ? (MESES_ABR[mes - 1] ?? '') : (MESES[mes - 1] ?? '')
}

function buildConcepto(tipo: string, meses: { anio: number; mes: number }[], empresaNombre?: string) {
  const sorted = [...meses].sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes)
  const first = sorted[0]!
  const last  = sorted[sorted.length - 1]!
  const label = tipo === 'ACTIVACIONES' ? 'Activaciones'
    : tipo === 'DESARROLLO' ? `Desarrollo${empresaNombre ? ` - ${empresaNombre}` : ''}`
    : tipo

  if (sorted.length === 1) return `${label} ${mesLabel(first.mes)} ${first.anio}`
  if (first.anio === last.anio) return `${label} ${mesLabel(first.mes, true)}-${mesLabel(last.mes, true)} ${first.anio}`
  return `${label} ${mesLabel(first.mes, true)} ${first.anio}-${mesLabel(last.mes, true)} ${last.anio}`
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
  const cobroIds = Array.isArray(body.cobroIds) ? (body.cobroIds as string[]) : []
  if (cobroIds.length === 0) return NextResponse.json({ error: 'cobroIds es requerido.' }, { status: 422 })

  // Verify none already have transferencias
  const existingCount = await prisma.transferencia.count({ where: { cobroId: { in: cobroIds } } })
  if (existingCount > 0) return NextResponse.json({ error: 'Algunos cobros ya tienen transferencias generadas.' }, { status: 409 })

  // Load all cobros with their distribuciones
  const cobros = await prisma.cobro.findMany({
    where: { id: { in: cobroIds } },
    include: {
      empresa: { select: { nombre: true } },
      facturaDesarrollo: { include: { distribuciones: { include: { socio: true } } } },
    },
  })
  if (cobros.length === 0) return NextResponse.json({ error: 'Cobros no encontrados.' }, { status: 404 })

  // Split by moneda/tipo
  const cobrosUYU = cobros.filter(c => c.moneda === 'UYU')
  const cobrosUSD = cobros.filter(c => c.moneda === 'USD')

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

  // UYU group (ACTIVACIONES / ADICIONAL): distribute by socios activos porcentaje
  if (cobrosUYU.length > 0) {
    const socios = await prisma.socio.findMany({
      where: { activo: true },
      select: { id: true, porcentajeParticipacion: true, cuentas: true },
    })
    const totalUYU = cobrosUYU.reduce((s, c) => s + Number(c.montoSinIva), 0)
    const mesesUYU = cobrosUYU.map(c => ({ anio: c.anio, mes: c.mes }))
    const tipoUYU  = cobrosUYU[0]!.tipo
    const conceptoUYU = buildConcepto(tipoUYU, mesesUYU)
    const refCobroId  = cobrosUYU[0]!.id

    for (const socio of socios) {
      const pct = Number(socio.porcentajeParticipacion)
      if (pct <= 0) continue
      const monto = Math.round(totalUYU * pct * 100) / 100
      const cuentas = socio.cuentas as Record<string, string> | null
      transferenciasData.push({
        socioId: socio.id,
        cobroId: refCobroId,
        moneda: 'UYU',
        monto,
        cuentaDestino: cuentas?.pesos ?? cuentas?.UYU ?? null,
        concepto: conceptoUYU,
        estado: 'PENDIENTE',
      })
    }
  }

  // USD group (DESARROLLO): use distribuciones from facturaDesarrollo
  if (cobrosUSD.length > 0) {
    // Aggregate monto per socio across all USD cobros
    const montosBySocio = new Map<string, { monto: number; socio: { cuentas: unknown } }>()

    for (const cobro of cobrosUSD) {
      if (cobro.facturaDesarrollo?.distribuciones?.length) {
        const facturaUSD = Number(cobro.facturaDesarrollo.totalUSD)
        for (const dist of cobro.facturaDesarrollo.distribuciones) {
          const montoUSD = Math.round(facturaUSD * (Number(dist.porcentaje) / 100) * 100) / 100
          const existing = montosBySocio.get(dist.socioId)
          montosBySocio.set(dist.socioId, {
            monto: (existing?.monto ?? 0) + montoUSD,
            socio: dist.socio,
          })
        }
      }
    }

    if (montosBySocio.size > 0) {
      const mesesUSD   = cobrosUSD.map(c => ({ anio: c.anio, mes: c.mes }))
      const empresaUSD = cobrosUSD[0]!.empresa.nombre
      const conceptoUSD = buildConcepto('DESARROLLO', mesesUSD, empresaUSD)
      const refCobroId  = cobrosUSD[0]!.id

      for (const [socioId, { monto, socio }] of montosBySocio.entries()) {
        const cuentas = (socio as { cuentas: unknown }).cuentas as Record<string, string> | null
        transferenciasData.push({
          socioId,
          cobroId: refCobroId,
          moneda: 'USD',
          monto: Math.round(monto * 100) / 100,
          cuentaDestino: cuentas?.usd ?? cuentas?.USD ?? null,
          concepto: conceptoUSD,
          estado: 'PENDIENTE',
        })
      }
    }
  }

  if (transferenciasData.length === 0) {
    return NextResponse.json({ error: 'No se encontraron socios o distribuciones para los cobros seleccionados.' }, { status: 422 })
  }

  // createMany doesn't return IDs, so create one by one to get them
  const createdIds: string[] = []
  for (const t of transferenciasData) {
    const created = await prisma.transferencia.create({ data: t, select: { id: true } })
    createdIds.push(created.id)
  }

  // Link each transferencia to all cobros via TransferenciaCobro
  // UYU transferencias link to all UYU cobros; USD to all USD cobros
  const cobrosUYUIds = cobrosUYU.map(c => c.id)
  const cobrosUSDIds = cobrosUSD.map(c => c.id)

  const transferenciaCobroData: { transferenciaId: string; cobroId: string }[] = []
  for (const id of createdIds) {
    const t = transferenciasData[createdIds.indexOf(id)]!
    const relevantCobroIds = t.moneda === 'USD' ? cobrosUSDIds : cobrosUYUIds
    for (const cobroId of relevantCobroIds) {
      transferenciaCobroData.push({ transferenciaId: id, cobroId })
    }
  }
  if (transferenciaCobroData.length > 0) {
    await prisma.transferenciaCobro.createMany({ data: transferenciaCobroData })
  }

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Transferencia',
      entidadId: cobroIds[0]!,
      accion: 'GENERAR_TRANSFERENCIAS',
      detalle: { cobroIds, cantidad: transferenciasData.length },
    },
  })

  return NextResponse.json({ ok: true, created: transferenciasData.length }, { status: 201 })
}
