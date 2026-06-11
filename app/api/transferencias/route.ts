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

function periodoFromConcepto(concepto: string): { anio: number; mes: number } | null {
  const match = concepto.match(/([A-Za-záéíóúÁÉÍÓÚ]+)\s+(\d{4})$/)
  if (!match) return null
  const mesIdx = MESES.findIndex(m => m.toLowerCase() === (match[1] ?? '').toLowerCase())
  if (mesIdx === -1) return null
  return { anio: parseInt(match[2]!), mes: mesIdx + 1 }
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
    // Match both legacy (via cobros) and new flow (via concepto string)
    const conceptoFilter = anio && mes
      ? { concepto: { contains: `${MESES[mes - 1] ?? ''} ${anio}` } }
      : anio
        ? { concepto: { contains: String(anio) } }
        : { concepto: { contains: MESES[(mes ?? 1) - 1] ?? '' } }

    where.OR = [
      {
        cobrosCobro: {
          some: {
            cobro: {
              ...(anio ? { anio } : {}),
              ...(mes  ? { mes  } : {}),
            },
          },
        },
      },
      conceptoFilter,
    ]
  }

  const transferencias = await prisma.transferencia.findMany({
    where,
    include: {
      socio: { select: { id: true, nombre: true } },
      cobro: { select: { id: true, tipo: true, anio: true, mes: true, empresa: { select: { nombre: true } } } },
      cobrosCobro: {
        include: {
          cobro: {
            select: {
              anio: true,
              mes: true,
              tipo: true,
              empresa: { select: { nombre: true } },
              montoSinIva: true,
              moneda: true,
            },
          },
        },
      },
    },
    orderBy: [{ cobro: { anio: 'desc' } }, { cobro: { mes: 'desc' } }, { socio: { nombre: 'asc' } }],
  })

  // Derive period for each transferencia (needed for CierreMensual lookup)
  type TWithPeriod = { t: typeof transferencias[number]; desde: { anio: number; mes: number }; hasta: { anio: number; mes: number } }
  const withPeriod: TWithPeriod[] = transferencias.map(t => {
    const cobrosVinculados = t.cobrosCobro.map(tc => tc.cobro)
    const sorted = [...cobrosVinculados].sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes)
    const desde = sorted[0]
      ?? (t.cobro ? { anio: t.cobro.anio, mes: t.cobro.mes } : null)
      ?? periodoFromConcepto(t.concepto)
      ?? { anio: new Date().getFullYear(), mes: new Date().getMonth() + 1 }
    const hasta = sorted[sorted.length - 1] ?? desde
    return { t, desde, hasta }
  })

  // Batch load CierreMensual + CierreSocio for all unique periods / socios
  const uniquePeriods = [...new Map(
    withPeriod.map(({ desde }) => [`${desde.anio}-${desde.mes}`, desde])
  ).values()]

  const cierres = await prisma.cierreMensual.findMany({
    where: { OR: uniquePeriods.map(p => ({ anio: p.anio, mes: p.mes })) },
    select: { id: true, anio: true, mes: true, snapshot: true },
  })
  const cierreByPeriod = new Map(cierres.map(c => [`${c.anio}-${c.mes}`, c]))

  const cierresSocio = cierres.length > 0
    ? await prisma.cierreSocio.findMany({
        where: {
          cierreMensualId: { in: cierres.map(c => c.id) },
          socioId: { in: [...new Set(transferencias.map(t => t.socioId))] },
        },
        select: { cierreMensualId: true, socioId: true, snapshot: true },
      })
    : []
  const cierreSocioByKey = new Map(cierresSocio.map(cs => [`${cs.cierreMensualId}:${cs.socioId}`, cs]))

  return NextResponse.json({
    transferencias: withPeriod.map(({ t, desde, hasta }) => {
      const cobrosVinculados = t.cobrosCobro.map(tc => tc.cobro)

      // Build cierreResumen
      let cierreResumen: { facturacionSinIva: string; totalGastos: string; resultadoActivaciones: string; socioPorcentaje: string | null } | null = null
      const cierre = cierreByPeriod.get(`${desde.anio}-${desde.mes}`)
      if (cierre) {
        const snap = (cierre.snapshot ?? {}) as Record<string, unknown>
        const ingresosSnap = (snap.ingresos ?? {}) as Record<string, unknown>
        const facturacionSinIva = String(ingresosSnap.facturacionSinIva ?? snap.totalIngresosSinIva ?? '0.00')
        const totalGastos = String(snap.totalGastos ?? '0.00')
        const resultadoActivaciones = (Number(facturacionSinIva) - Number(totalGastos)).toFixed(2)

        const cs = cierreSocioByKey.get(`${cierre.id}:${t.socioId}`)
        const csSnap = (cs?.snapshot ?? {}) as Record<string, unknown>
        const socioPorcentaje = csSnap.socioPorcentaje != null ? String(csSnap.socioPorcentaje) : null

        cierreResumen = { facturacionSinIva, totalGastos, resultadoActivaciones, socioPorcentaje }
      }

      return {
        id: t.id,
        socioId: t.socioId,
        socio: t.socio.nombre,
        cobroId: t.cobroId,
        cobroTipo: t.cobro?.tipo ?? 'CIERRE',
        cobroAnio: t.cobro?.anio ?? desde.anio,
        cobroMes:  t.cobro?.mes  ?? desde.mes,
        empresa:   t.cobro?.empresa?.nombre ?? '—',
        moneda: t.moneda,
        monto: t.monto.toString(),
        cuentaDestino: t.cuentaDestino,
        fecha: t.fecha?.toISOString() ?? null,
        estado: t.estado,
        concepto: t.concepto,
        creadoEn: t.creadoEn.toISOString(),
        periodoDesde: { anio: desde.anio, mes: desde.mes },
        periodoHasta: { anio: hasta.anio, mes: hasta.mes },
        cobrosDetalle: cobrosVinculados.map(c => ({
          empresa: c.empresa.nombre,
          tipo: c.tipo,
          periodo: `${mesLabel(c.mes, true)} ${c.anio}`,
          montoSinIva: c.montoSinIva.toString(),
          moneda: c.moneda,
        })),
        cierreResumen,
      }
    }),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  // New flow: generate from CierreMensual by period
  if (body.anio !== undefined || body.mes !== undefined) {
    return postDesdeCierre(body, auth.user.id)
  }

  // Legacy flow: generate from selected cobros
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

  await prisma.transferencia.createMany({ data: transferenciasData })

  // Fetch the just-created transferencias by matching the reference cobroIds
  const refIds = [cobrosUYU[0]?.id, cobrosUSD[0]?.id].filter((x): x is string => Boolean(x))
  const creadas = await prisma.transferencia.findMany({
    where: { cobroId: { in: refIds } },
    select: { id: true, moneda: true },
  })

  // Link each transferencia to all cobros of its moneda via TransferenciaCobro
  const tcData: { transferenciaId: string; cobroId: string }[] = []
  for (const t of creadas) {
    const cobrosDeEstaMoneda = t.moneda === 'UYU' ? cobrosUYU : cobrosUSD
    for (const cobro of cobrosDeEstaMoneda) {
      tcData.push({ transferenciaId: t.id, cobroId: cobro.id })
    }
  }
  if (tcData.length > 0) {
    await prisma.transferenciaCobro.createMany({ data: tcData, skipDuplicates: true })
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

// ── New flow: generate transferencias from a closed CierreMensual ─────────────

async function postDesdeCierre(body: Record<string, unknown>, usuarioId: string) {
  const anio = typeof body.anio === 'number' ? body.anio : parseInt(String(body.anio ?? ''))
  const mes  = typeof body.mes  === 'number' ? body.mes  : parseInt(String(body.mes  ?? ''))

  if (!anio || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'Parámetros anio y mes requeridos.' }, { status: 422 })
  }

  const cierre = await prisma.cierreMensual.findUnique({
    where: { anio_mes: { anio, mes } },
    include: {
      cierresSocio: {
        include: { socio: { select: { id: true, nombre: true, cuentas: true } } },
      },
    },
  })

  if (!cierre) {
    return NextResponse.json({ error: 'No existe cierre para el período indicado.', code: 'CIERRE_NO_ENCONTRADO' }, { status: 404 })
  }

  if (cierre.estado.trim().toUpperCase() !== 'CERRADO') {
    return NextResponse.json({ error: 'El período no está cerrado. Solo se pueden generar transferencias desde períodos cerrados.', code: 'CIERRE_NO_CERRADO' }, { status: 422 })
  }

  // Prevent duplicates: match by concepto containing the period label
  const periodoStr = `${MESES[mes - 1] ?? ''} ${anio}`
  const existentes = await prisma.transferencia.findMany({
    where: { concepto: { contains: periodoStr } },
    select: { socioId: true, moneda: true },
  })
  const existenteSet = new Set(existentes.map(t => `${t.socioId}:${t.moneda}`))

  const periodoLabel = `${MESES[mes - 1] ?? ''} ${anio}`

  type Row = { socioId: string; moneda: string; monto: number; cuentaDestino: string | null; concepto: string; estado: string }
  const rows: Row[] = []

  for (const cs of cierre.cierresSocio) {
    const snap = cs.snapshot as Record<string, unknown>
    // Prefer new desglose fields; fall back to old fields for historical cierres
    const montoPesos = Number(snap.montoActivaciones ?? snap.montoPesos ?? 0)
    const montoUsd   = snap.montoDesarrolloUSD != null ? Number(snap.montoDesarrolloUSD)
                     : snap.montoUsd != null ? Number(snap.montoUsd)
                     : null
    const cuentas    = cs.socio.cuentas as Record<string, string> | null

    if (montoPesos > 0 && !existenteSet.has(`${cs.socio.id}:UYU`)) {
      rows.push({
        socioId:       cs.socio.id,
        moneda:        'UYU',
        monto:         Math.round(montoPesos * 100) / 100,
        cuentaDestino: cuentas?.pesos ?? cuentas?.UYU ?? null,
        concepto:      `Activaciones ${periodoLabel}`,
        estado:        'PENDIENTE',
      })
    }

    if (montoUsd !== null && montoUsd > 0 && !existenteSet.has(`${cs.socio.id}:USD`)) {
      rows.push({
        socioId:       cs.socio.id,
        moneda:        'USD',
        monto:         Math.round(montoUsd * 100) / 100,
        cuentaDestino: cuentas?.usd ?? cuentas?.USD ?? null,
        concepto:      `Desarrollo ${periodoLabel}`,
        estado:        'PENDIENTE',
      })
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No hay transferencias a generar. Puede que ya existan para este período o los montos sean cero.', code: 'SIN_TRANSFERENCIAS' }, { status: 422 })
  }

  await prisma.transferencia.createMany({ data: rows })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Transferencia',
      entidadId: cierre.id,
      accion: 'GENERAR_TRANSFERENCIAS_DESDE_CIERRE',
      detalle: { anio, mes, cantidad: rows.length },
    },
  })

  return NextResponse.json({ ok: true, created: rows.length }, { status: 201 })
}
