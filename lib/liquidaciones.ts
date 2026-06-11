import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type PeriodInput = {
  anio: number
  mes: number
}

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}

function rate(value: Prisma.Decimal) {
  return value.toDecimalPlaces(6).toString()
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function parsePeriodParams(params: URLSearchParams): PeriodInput | null {
  const anio = Number(params.get('anio'))
  const mes = Number(params.get('mes'))

  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return null
  }

  return { anio, mes }
}

export function periodFromUrl(params: URLSearchParams) {
  return parsePeriodParams(params)
}

export async function buildLiquidacionPreview(period: PeriodInput) {
  const [facturaciones, ingresosAdicionales, gastos, gastosFijosConceptos, socios, tipoCambioParametro, cierrePeriodo, facturaDesarrollo, cobros] =
    await Promise.all([
      prisma.facturacionMensual.findMany({
        where: {
          anio: period.anio,
          mes: period.mes,
          importacion: {
            estado: {
              in: ['ACTIVA', 'CONFIRMADA'],
            },
            anuladaEn: null,
          },
          estadoCobro: {
            codigo: {
              not: 'ANULADO',
            },
          },
        },
        include: {
          empresa: { select: { id: true, nombre: true } },
        },
      }),
      prisma.ingresoAdicional.findMany({
        where: { anio: period.anio, mes: period.mes },
        include: { empresa: { select: { id: true, nombre: true } } },
      }),
      prisma.gastoMensual.findMany({
        where: { anio: period.anio, mes: period.mes },
        include: { concepto: true },
      }),
      // Fixed expenses are calculated dynamically from active concepts with monto
      prisma.gastoConcepto.findMany({
        where: { tipo: 'FIJO', activo: true, monto: { not: null } },
        orderBy: { nombre: 'asc' },
      }),
      prisma.socio.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.parametro.findUnique({
        where: { clave: 'tipo_cambio_usd' },
        select: { valor: true },
      }),
      prisma.cierreMensual.findUnique({
        where: { anio_mes: { anio: period.anio, mes: period.mes } },
        select: { id: true, estado: true, snapshot: true },
      }),
      prisma.facturaDesarrollo.findMany({
        where: { anio: period.anio, mes: period.mes },
        include: {
          empresa: { select: { id: true, nombre: true } },
          distribuciones: { include: { socio: { select: { id: true, nombre: true } } } },
        },
      }),
      prisma.cobro.findMany({
        where: { anio: period.anio, mes: period.mes },
        select: {
          id: true,
          tipo: true,
          estado: true,
          montoSinIva: true,
          montoConIva: true,
          moneda: true,
          empresa: { select: { nombre: true } },
        },
      }),
    ])
  const cierreEstado = normalizeEstado(cierrePeriodo?.estado)
  const cierreCerrado = cierreEstado === 'CERRADO'
  const cierreReabierto = cierreEstado === 'REABIERTO'

  const facturacionSinIva = sumDecimal(facturaciones.map((row) => row.totalSinIva))
  const facturacionIva = sumDecimal(facturaciones.map((row) => row.iva))
  const facturacionConIva = sumDecimal(facturaciones.map((row) => row.totalConIva))
  const totalGastosVariables = sumDecimal(gastos.map((row) => row.importe))
  const totalGastosFijos = sumDecimal(gastosFijosConceptos.map((c) => c.monto!))
  const totalGastos = totalGastosVariables.add(totalGastosFijos)

  // Exclude IngresoAdicional rows that belong to a FacturaDesarrollo to avoid double-counting
  const facturaDesarrolloIngresoIds = new Set(
    facturaDesarrollo.map(f => f.ingresoAdicionalId).filter((id): id is string => id !== null)
  )
  const ingresosAdicionalesPuros = ingresosAdicionales.filter(i => !facturaDesarrolloIngresoIds.has(i.id))

  const ingresosAdicionalesSinIva = sumDecimal(ingresosAdicionalesPuros.map((row) => row.montoSinIva))
  const ingresosAdicionalesIva = sumDecimal(ingresosAdicionalesPuros.map((row) => row.iva))
  const ingresosAdicionalesConIva = sumDecimal(ingresosAdicionalesPuros.map((row) => row.montoConIva))
  const totalIngresosSinIva = facturacionSinIva.add(ingresosAdicionalesSinIva)
  const totalIva = facturacionIva.add(ingresosAdicionalesIva)
  const totalIngresosConIva = facturacionConIva.add(ingresosAdicionalesConIva)

  const resultadoActivaciones = facturacionSinIva.sub(totalGastos)
  const ingresosAdicionalesPurosSinIva = ingresosAdicionalesSinIva
  const resultadoAdicionales = ingresosAdicionalesPurosSinIva
  const desarrolloTotalUYU = sumDecimal(facturaDesarrollo.map(f => f.totalUYU))
  const resultadoDesarrollo = desarrolloTotalUYU
  const resultadoDesarrolloUSD = sumDecimal(facturaDesarrollo.map(f => f.totalConIva))
  const resultadoDistribuible = resultadoActivaciones.add(resultadoAdicionales).add(resultadoDesarrollo)
  const tipoCambioSnapshot =
    cierreCerrado && cierrePeriodo ? decimalSnapshot(safeSnapshot(cierrePeriodo.snapshot), 'tipoCambioUsd') : null
  const tipoCambioUsd = resolveTipoCambioUsd({
    cierreCerrado,
    snapshot: tipoCambioSnapshot,
    parametro: tipoCambioParametro?.valor ?? null,
  })
  const validaciones: Array<{ codigo: string; mensaje: string }> = []
  const avisos: Array<{ codigo: string; mensaje: string }> = []

  if (!tipoCambioUsd || tipoCambioUsd.lessThanOrEqualTo(0)) {
    validaciones.push({
      codigo: 'TIPO_CAMBIO_USD_INVALIDO',
      mensaje: 'Falta configurar tipo de cambio USD válido para el período.',
    })
  }

  if (cierreCerrado) {
    validaciones.push({
      codigo: 'CIERRE_MENSUAL_EXISTENTE',
      mensaje: 'Este período ya fue cerrado y no puede volver a cerrarse.',
    })
  }

  if (facturaciones.length === 0) {
    validaciones.push({
      codigo: 'FACTURACION_CONFIRMADA_REQUERIDA',
      mensaje: 'No existe importación/facturación confirmada para este período. No se puede cerrar.',
    })
  }

  if (cierreReabierto) {
    avisos.push({
      codigo: 'CIERRE_MENSUAL_REABIERTO',
      mensaje: 'Este perÃ­odo fue reabierto. Puede volver a cerrarse.',
    })
  }

  const porcentajeSocios = sumDecimal(socios.map((socio) => socio.porcentajeParticipacion))
  if (!porcentajeSocios.equals(1)) {
    validaciones.push({
      codigo: 'SOCIOS_NO_SUMAN_100',
      mensaje: `Los socios activos deben sumar 100%. Suma actual: ${porcentajeSocios.mul(100).toDecimalPlaces(2).toFixed(2)}%.`,
    })
  }

  const validTipoCambio = tipoCambioUsd && tipoCambioUsd.greaterThan(0) ? tipoCambioUsd : null
  const sociosPreview = socios.map((socio) => {
    const montoActivaciones = resultadoActivaciones.mul(socio.porcentajeParticipacion)
    const montoAdicionales = resultadoAdicionales.mul(socio.porcentajeParticipacion)
    const montoDesarrollo = sumDecimal(
      facturaDesarrollo.flatMap(f =>
        f.distribuciones.filter(d => d.socioId === socio.id).map(d => d.montoUYU)
      )
    )
    const montoPesos = montoActivaciones.add(montoAdicionales).add(montoDesarrollo)
    const montoUsd = validTipoCambio ? money(montoPesos.div(validTipoCambio)) : null

    return {
      id: socio.id,
      nombre: socio.nombre,
      porcentaje: rate(socio.porcentajeParticipacion),
      cuentas: socio.cuentas,
      montoActivaciones: money(montoActivaciones),
      montoAdicionales: money(montoAdicionales),
      montoDesarrollo: money(montoDesarrollo),
      montoPesos: money(montoPesos),
      montoUsd,
    }
  })

  const totalActivaciones = facturaciones.reduce((total, row) => total + row.cantidadActivaciones, 0)
  const totalEmpresas = new Set(facturaciones.map((row) => row.empresaId)).size

  return {
    anio: period.anio,
    mes: period.mes,
    ingresos: {
      facturacionSinIva: money(facturacionSinIva),
      ingresosAdicionalesSinIva: money(ingresosAdicionalesSinIva),
      totalIngresosSinIva: money(totalIngresosSinIva),
      totalIva: money(totalIva),
      ingresosConIva: money(totalIngresosConIva),
      facturaciones: facturaciones.map((row) => ({
        id: row.id,
        empresa: row.empresa.nombre,
        totalSinIva: money(row.totalSinIva),
        iva: money(row.iva),
        totalConIva: money(row.totalConIva),
        cantidadActivaciones: row.cantidadActivaciones,
      })),
      adicionales: ingresosAdicionalesPuros.map((row) => ({
        id: row.id,
        concepto: row.concepto,
        empresa: row.empresa?.nombre ?? null,
        montoSinIva: money(row.montoSinIva),
        iva: money(row.iva),
        montoConIva: money(row.montoConIva),
      })),
      ingresosAdicionalesPurosSinIva: money(ingresosAdicionalesPurosSinIva),
      desarrolloFacturas: facturaDesarrollo.map(f => {
        const ivaUYU = f.totalUYU.mul('0.22').toDecimalPlaces(2)
        const totalConIvaUYU = f.totalUYU.add(ivaUYU).toDecimalPlaces(2)
        return {
          id: f.id,
          empresa: f.empresa.nombre,
          totalHoras: f.totalHoras.toString(),
          totalUSD: money(f.totalUSD),
          ivaUSD: money(f.iva),
          totalConIvaUSD: money(f.totalConIva),
          tipoCambio: money(f.tipoCambio),
          totalConIvaUYU: money(totalConIvaUYU),
          distribuciones: f.distribuciones.map(d => {
            const pct = d.porcentaje.div(100)
            return {
              id: d.id,
              socioNombre: d.socio.nombre,
              porcentaje: d.porcentaje.toDecimalPlaces(2).toString(),
              montoUSD: money(f.totalUSD.mul(pct).toDecimalPlaces(2)),
              montoUYU: money(f.totalUYU.mul(pct).toDecimalPlaces(2)),
            }
          }),
        }
      }),
    },
    gastos: {
      totalGastos: money(totalGastos),
      totalGastosFijos: money(totalGastosFijos),
      totalGastosVariables: money(totalGastosVariables),
      detalle: [
        ...gastosFijosConceptos.map((c) => ({
          id: c.id,
          concepto: c.nombre,
          tipo: 'FIJO' as const,
          importe: money(c.monto!),
        })),
        ...gastos.map((row) => ({
          id: row.id,
          concepto: row.concepto.nombre,
          tipo: row.concepto.tipo,
          importe: money(row.importe),
        })),
      ],
    },
    resultado: {
      resultadoDistribuible: money(resultadoDistribuible),
      resultadoActivaciones: money(resultadoActivaciones),
      resultadoAdicionales: money(resultadoAdicionales),
      resultadoDesarrollo: money(resultadoDesarrollo),
      resultadoDesarrolloUSD: money(resultadoDesarrolloUSD),
      tipoCambioUsd: tipoCambioUsd ? rate(tipoCambioUsd) : null,
      totalActivaciones,
      totalEmpresas,
    },
    socios: sociosPreview,
    cobros: buildCobrosResumen(cobros),
    validaciones,
    avisos,
    puedeCerrar: validaciones.length === 0,
  }
}

export async function cerrarLiquidacion(period: PeriodInput, confirmacion: boolean, usuarioId?: string) {
  if (!confirmacion) {
    return {
      error: { error: 'CONFIRMACION_REQUERIDA', message: 'Debe confirmar el cierre mensual.' },
      status: 422,
    }
  }

  const preview = await buildLiquidacionPreview(period)
  if (!preview.puedeCerrar) {
    return {
      error: { error: 'LIQUIDACION_INVALIDA', validaciones: preview.validaciones },
      status: 422,
    }
  }

  const now = new Date()
  const cierre = await prisma
    .$transaction(async (tx) => {
    const cierreExistente = await tx.cierreMensual.findUnique({
      where: { anio_mes: { anio: period.anio, mes: period.mes } },
      select: { id: true, estado: true },
    })
    const snapshot = buildCierreSnapshot(preview)

    if (normalizeEstado(cierreExistente?.estado) === 'CERRADO') {
      throw new LiquidacionError({
        error: 'LIQUIDACION_INVALIDA',
        validaciones: [
          {
            codigo: 'CIERRE_MENSUAL_EXISTENTE',
            mensaje: 'Este perÃ­odo ya fue cerrado y no puede volver a cerrarse.',
          },
        ],
      })
    }

    const cierreMensual = cierreExistente
      ? await tx.cierreMensual.update({
          where: { id: cierreExistente.id },
          data: {
            estado: 'CERRADO',
            cerradoAt: now,
            snapshot,
          },
        })
      : await tx.cierreMensual.create({
          data: {
            anio: period.anio,
            mes: period.mes,
            estado: 'CERRADO',
            cerradoAt: now,
            snapshot,
          },
        })

    if (cierreExistente) {
      await tx.cierreSocio.deleteMany({
        where: { cierreMensualId: cierreMensual.id },
      })
    }

    await tx.cierreSocio.createMany({
      data: preview.socios.map((socio) => ({
        cierreMensualId: cierreMensual.id,
        socioId: socio.id,
        snapshot: {
          socioNombre: socio.nombre,
          socioPorcentaje: socio.porcentaje,
          socioCuentas: socio.cuentas,
          montoPesos: socio.montoPesos,
          montoUsd: socio.montoUsd,
        },
      })),
    })

    await tx.auditoria.create({
      data: {
        entidad: 'CierreMensual',
        entidadId: cierreMensual.id,
        usuarioId,
        accion: cierreExistente ? 'RECERRAR_LIQUIDACION_MENSUAL' : 'CERRAR_LIQUIDACION_MENSUAL',
        detalle: snapshot,
      },
    })

      return cierreMensual
    })
    .catch((error: unknown) => {
      if (error instanceof LiquidacionError) {
        return error
      }

      throw error
    })

  if (cierre instanceof LiquidacionError) {
    return {
      error: cierre.payload,
      status: 422,
    }
  }

  return {
    data: {
      id: cierre.id,
      anio: cierre.anio,
      mes: cierre.mes,
      estado: cierre.estado,
      cerradoAt: iso(cierre.cerradoAt),
      snapshot: cierre.snapshot,
    },
    status: 201,
  }
}

export async function getCierres() {
  const rows = await prisma.cierreMensual.findMany({
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
  })

  return {
    rows: rows.map(serializeCierreListItem),
  }
}

export async function getCierre(id: string) {
  const cierre = await prisma.cierreMensual.findUnique({
    where: { id },
    include: {
      cierresSocio: {
        orderBy: { socio: { nombre: 'asc' } },
        include: { socio: { select: { nombre: true } } },
      },
    },
  })

  if (!cierre) {
    return null
  }

  return {
    ...serializeCierreListItem(cierre),
    snapshot: cierre.snapshot,
    socios: cierre.cierresSocio.map((row) => ({
      id: row.id,
      socioId: row.socioId,
      socioNombre: row.socio.nombre,
      snapshot: row.snapshot,
    })),
  }
}

function buildCobrosResumen(cobros: {
  id: string
  tipo: string
  estado: string
  montoSinIva: Prisma.Decimal
  montoConIva: Prisma.Decimal
  moneda: string
  empresa: { nombre: string } | null
}[]) {
  const cobrados = cobros.filter((c) => c.estado === 'COBRADO')
  const facturados = cobros.filter((c) => c.estado === 'FACTURADO')
  const toUYU = (c: { montoConIva: Prisma.Decimal; moneda: string }) =>
    c.moneda === 'UYU' ? c.montoConIva : new Prisma.Decimal(0)
  return {
    total: cobros.length,
    cobrados: cobrados.length,
    facturados: facturados.length,
    totalCobradoUYU: money(sumDecimal(cobrados.map(toUYU))),
    totalPendienteUYU: money(sumDecimal(facturados.map(toUYU))),
    detalle: cobros.map((c) => ({
      tipo: c.tipo,
      empresa: c.empresa?.nombre ?? '—',
      estado: c.estado,
      montoConIva: money(c.montoConIva),
      moneda: c.moneda,
    })),
  }
}

function buildCierreSnapshot(preview: Awaited<ReturnType<typeof buildLiquidacionPreview>>) {
  return {
    anio: preview.anio,
    mes: preview.mes,
    totalActivaciones: preview.resultado.totalActivaciones,
    totalEmpresas: preview.resultado.totalEmpresas,
    totalIngresosSinIva: preview.ingresos.totalIngresosSinIva,
    totalIva: preview.ingresos.totalIva,
    totalIngresosConIva: preview.ingresos.ingresosConIva,
    totalGastos: preview.gastos.totalGastos,
    resultadoDistribuible: preview.resultado.resultadoDistribuible,
    tipoCambioUsd: preview.resultado.tipoCambioUsd,
    ingresos: preview.ingresos,
    gastos: preview.gastos,
    socios: preview.socios.map((socio) => ({
      socioId: socio.id,
      socioNombre: socio.nombre,
      socioPorcentaje: socio.porcentaje,
      socioCuentas: socio.cuentas,
      montoPesos: socio.montoPesos,
      montoUsd: socio.montoUsd,
    })),
    cobros: preview.cobros,
  }
}

function serializeCierreListItem(cierre: {
  id: string
  anio: number
  mes: number
  estado: string
  cerradoAt: Date | null
  reabiertoAt?: Date | null
  motivoReapertura?: string | null
  creadoEn: Date
  snapshot: Prisma.JsonValue
}) {
  const snapshot = safeSnapshot(cierre.snapshot)
  return {
    id: cierre.id,
    anio: cierre.anio,
    mes: cierre.mes,
    estado: cierre.estado,
    totalActivaciones: numberSnapshot(snapshot, 'totalActivaciones'),
    totalIngresosSinIva: stringSnapshot(snapshot, 'totalIngresosSinIva'),
    totalGastos: stringSnapshot(snapshot, 'totalGastos'),
    resultadoDistribuible: stringSnapshot(snapshot, 'resultadoDistribuible'),
    cerradoAt: iso(cierre.cerradoAt ?? cierre.creadoEn),
    reabiertoAt: iso(cierre.reabiertoAt),
    motivoReapertura: cierre.motivoReapertura ?? null,
  }
}

function safeSnapshot(snapshot: Prisma.JsonValue) {
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? (snapshot as Record<string, Prisma.JsonValue>)
    : {}
}

function stringSnapshot(snapshot: Record<string, Prisma.JsonValue>, key: string) {
  const value = snapshot[key]
  return typeof value === 'string' ? value : '0.00'
}

function numberSnapshot(snapshot: Record<string, Prisma.JsonValue>, key: string) {
  const value = snapshot[key]
  return typeof value === 'number' ? value : 0
}

function decimalSnapshot(snapshot: Record<string, Prisma.JsonValue>, key: string) {
  const value = snapshot[key]
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  try {
    return new Prisma.Decimal(value)
  } catch {
    return null
  }
}

function resolveTipoCambioUsd({
  cierreCerrado,
  parametro,
  snapshot,
}: {
  cierreCerrado: boolean
  parametro: Prisma.Decimal | null
  snapshot: Prisma.Decimal | null
}) {
  if (cierreCerrado) {
    return snapshot && snapshot.greaterThan(0) && !snapshot.equals(1) ? snapshot : null
  }

  if (!parametro || parametro.lessThanOrEqualTo(0) || parametro.equals(1)) {
    return null
  }

  return parametro
}

function sumDecimal(values: Prisma.Decimal[]) {
  return values.reduce((total, value) => total.add(value), new Prisma.Decimal(0))
}

function normalizeEstado(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? null
}

class LiquidacionError extends Error {
  payload: { error: string; validaciones: Array<{ codigo: string; mensaje: string }> }

  constructor(payload: { error: string; validaciones: Array<{ codigo: string; mensaje: string }> }) {
    super(payload.error)
    this.payload = payload
  }
}
