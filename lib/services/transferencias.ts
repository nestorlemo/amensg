import { prisma } from '@/lib/prisma'

export type CobrosDisponiblesFilters = {
  empresaId?: string
  fechaDesde?: string
  fechaHasta?: string
}

export async function getCobrosDisponibles(filters: CobrosDisponiblesFilters = {}) {
  const { empresaId, fechaDesde, fechaHasta } = filters

  const where: Record<string, unknown> = {
    estado: 'COBRADO',
    transferenciaCobros: { none: {} },
  }
  if (empresaId) where.empresaId = empresaId
  if (fechaDesde || fechaHasta) {
    const range: Record<string, Date> = {}
    if (fechaDesde) range.gte = new Date(fechaDesde)
    if (fechaHasta) {
      const h = new Date(fechaHasta)
      h.setDate(h.getDate() + 1)
      range.lt = h
    }
    where.fechaCobro = range
  }

  const cobros = await prisma.cobro.findMany({
    where,
    include: { empresa: { select: { nombre: true } } },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadoEn: 'desc' }],
  })

  return cobros.map((c) => ({
    id: c.id,
    tipo: c.tipo,
    empresa: c.empresa.nombre,
    empresaId: c.empresaId,
    anio: c.anio,
    mes: c.mes,
    moneda: c.moneda,
    montoSinIva: c.montoSinIva.toString(),
    montoConIva: c.montoConIva.toString(),
    estado: c.estado,
    fechaCobro: c.fechaCobro?.toISOString() ?? null,
  }))
}

export type TransferenciasFilters = {
  socioId?: string
  estado?: string
  moneda?: string
  anio?: number
  mes?: number
}

export async function getTransferencias(filters: TransferenciasFilters = {}) {
  const { socioId, estado, moneda, anio, mes } = filters

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

  return transferencias.map((t) => ({
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
  }))
}

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

export async function generarTransferencias(cobroIds: string[], usuarioId: string) {
  if (cobroIds.length === 0) return { validationError: 'cobroIds es requerido.' }

  const existingCount = await prisma.transferencia.count({ where: { cobroId: { in: cobroIds } } })
  if (existingCount > 0) return { conflict: 'Algunos cobros ya tienen transferencias generadas.' }

  const cobros = await prisma.cobro.findMany({
    where: { id: { in: cobroIds } },
    include: {
      empresa: { select: { nombre: true } },
      facturaDesarrollo: { include: { distribuciones: { include: { socio: true } } } },
    },
  })
  if (cobros.length === 0) return { notFound: 'Cobros no encontrados.' }

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

  if (cobrosUSD.length > 0) {
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
      const mesesUSD    = cobrosUSD.map(c => ({ anio: c.anio, mes: c.mes }))
      const empresaUSD  = cobrosUSD[0]!.empresa.nombre
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
    return { validationError: 'No se encontraron socios o distribuciones para los cobros seleccionados.' }
  }

  await prisma.transferencia.createMany({ data: transferenciasData })

  const refIds = [cobrosUYU[0]?.id, cobrosUSD[0]?.id].filter((x): x is string => Boolean(x))
  const creadas = await prisma.transferencia.findMany({
    where: { cobroId: { in: refIds } },
    select: { id: true, moneda: true },
  })

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
      usuarioId,
      entidad: 'Transferencia',
      entidadId: cobroIds[0]!,
      accion: 'GENERAR_TRANSFERENCIAS',
      detalle: { cobroIds, cantidad: transferenciasData.length },
    },
  })

  return { created: transferenciasData.length }
}

export async function marcarTransferido(
  id: string,
  fields: { estado?: string; fecha?: string | null },
  usuarioId: string,
) {
  const data: Record<string, unknown> = {}
  if (fields.estado !== undefined) data.estado = fields.estado
  if (fields.fecha !== undefined) data.fecha = fields.fecha ? new Date(fields.fecha) : null

  const updated = await prisma.transferencia.update({ where: { id }, data })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Transferencia',
      entidadId: id,
      accion: 'MARCAR_TRANSFERIDO',
      detalle: { estado: updated.estado, fecha: updated.fecha?.toISOString() ?? null },
    },
  })

  return updated
}
