import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getClosedPeriodKeys, periodKey } from '@/lib/periods'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>

function param(params: SearchParamsInput, key: string) {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined
  }

  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function numberParam(params: SearchParamsInput, key: string) {
  const value = param(params, key)
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function stringParam(params: SearchParamsInput, key: string) {
  const value = param(params, key)?.trim()
  return value ? value : undefined
}

function pageParams(params: SearchParamsInput) {
  const page = Math.max(numberParam(params, 'page') ?? 1, 1)
  const pageSize = Math.min(Math.max(numberParam(params, 'pageSize') ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
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

function rawString(value: Prisma.JsonValue, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ''
  }

  const row = value as Record<string, Prisma.JsonValue>

  for (const key of keys) {
    const rawValue = row[key]

    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue
    }
  }

  return ''
}

function getBillingFilters(params: SearchParamsInput) {
  const anio = numberParam(params, 'anio')
  const mes = numberParam(params, 'mes')
  const empresaId = stringParam(params, 'empresaId')
  const importacionId = stringParam(params, 'importacionId')
  const estadoCobro = stringParam(params, 'estadoCobro') ?? stringParam(params, 'estado')

  return {
    anio,
    mes,
    empresaId,
    importacionId,
    estadoCobro,
    where: {
      ...(anio ? { anio } : {}),
      ...(mes ? { mes } : {}),
      ...(empresaId ? { empresaId } : {}),
      ...(importacionId ? { importacionId } : {}),
      ...(estadoCobro ? { estadoCobro: { codigo: estadoCobro } } : {}),
    } satisfies Prisma.FacturacionMensualWhereInput,
  }
}

function activeBillingWhere(where: Prisma.FacturacionMensualWhereInput, params: SearchParamsInput) {
  const importacionId = stringParam(params, 'importacionId')
  const estadoCobro = stringParam(params, 'estadoCobro') ?? stringParam(params, 'estado')

  if (importacionId || estadoCobro === 'ANULADO') {
    return where
  }

  return {
    AND: [
      where,
      {
        estadoCobro: {
          codigo: {
            not: 'ANULADO',
          },
        },
        importacion: {
          estado: {
            not: 'ANULADA',
          },
        },
      },
    ],
  } satisfies Prisma.FacturacionMensualWhereInput
}

export async function getImportaciones(params: SearchParamsInput) {
  const page = Math.max(numberParam(params, 'page') ?? 1, 1)
  const pageSize = 20
  const skip = (page - 1) * pageSize
  const anio = numberParam(params, 'anio')
  const mes = numberParam(params, 'mes')
  const estado = stringParam(params, 'estado')
  const where: Prisma.ImportacionActivacionWhereInput = {
    ...(anio ? { anio } : {}),
    ...(mes ? { mes } : {}),
    ...(estado ? { estado } : {}),
  }

  const [total, importaciones] = await Promise.all([
    prisma.importacionActivacion.count({ where }),
    prisma.importacionActivacion.findMany({
      where,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadaEn: 'desc' }],
      skip,
      take: pageSize,
      include: {
        facturaciones: {
          select: {
            empresaId: true,
          },
        },
        _count: {
          select: {
            activaciones: true,
          },
        },
      },
    }),
  ])

  // Fetch completed/without counts in bulk using groupBy
  const importacionIds = importaciones.map((i) => i.id)
  const [completedCounts, withoutCounts] = await Promise.all([
    prisma.activacionImportada.groupBy({
      by: ['importacionId'],
      where: { importacionId: { in: importacionIds }, tieneFechaRealActivacion: true },
      _count: { _all: true },
    }),
    prisma.activacionImportada.groupBy({
      by: ['importacionId'],
      where: { importacionId: { in: importacionIds }, tieneFechaRealActivacion: false },
      _count: { _all: true },
    }),
  ])

  const completedMap = new Map(completedCounts.map((r) => [r.importacionId, r._count._all]))
  const withoutMap = new Map(withoutCounts.map((r) => [r.importacionId, r._count._all]))

  const data = importaciones.map((importacion) => ({
    id: importacion.id,
    anio: importacion.anio,
    mes: importacion.mes,
    nombreArchivo: importacion.nombreArchivo,
    estado: importacion.estado,
    anuladaEn: iso(importacion.anuladaEn),
    motivoAnulacion: importacion.motivoAnulacion,
    totalRows: importacion._count.activaciones,
    companies: new Set(importacion.facturaciones.map((facturacion) => facturacion.empresaId)).size,
    completedActivations: completedMap.get(importacion.id) ?? 0,
    withoutRealActivationDate: withoutMap.get(importacion.id) ?? 0,
    creadaEn: iso(importacion.creadaEn),
  }))

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  }
}

export async function getImportacionDetail(id: string) {
  const importacion = await prisma.importacionActivacion.findUnique({
    where: { id },
    include: {
      facturaciones: {
        orderBy: {
          empresa: {
            nombre: 'asc',
          },
        },
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
            },
          },
          estadoCobro: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      },
    },
  })

  if (!importacion) {
    return null
  }

  const activaciones = await prisma.activacionImportada.findMany({
    where: { importacionId: id },
    select: {
      empresaId: true,
      empresaNombreArchivo: true,
      tieneFechaRealActivacion: true,
    },
  })

  const companyCounts = new Map<
    string,
    {
      empresaId: string
      empresaNombreArchivo: string
      totalRows: number
      completedActivations: number
      withoutRealActivationDate: number
    }
  >()

  for (const activacion of activaciones) {
    const key = `${activacion.empresaId}:${activacion.empresaNombreArchivo}`
    const current =
      companyCounts.get(key) ??
      {
        empresaId: activacion.empresaId,
        empresaNombreArchivo: activacion.empresaNombreArchivo,
        totalRows: 0,
        completedActivations: 0,
        withoutRealActivationDate: 0,
      }

    current.totalRows += 1
    current.completedActivations += activacion.tieneFechaRealActivacion ? 1 : 0
    current.withoutRealActivationDate += activacion.tieneFechaRealActivacion ? 0 : 1
    companyCounts.set(key, current)
  }

  return {
    id: importacion.id,
    anio: importacion.anio,
    mes: importacion.mes,
    nombreArchivo: importacion.nombreArchivo,
    hashArchivo: importacion.hashArchivo,
    estado: importacion.estado,
    anuladaEn: iso(importacion.anuladaEn),
    motivoAnulacion: importacion.motivoAnulacion,
    creadaEn: iso(importacion.creadaEn),
    totalRows: activaciones.length,
    completedActivations: activaciones.filter((activacion) => activacion.tieneFechaRealActivacion).length,
    withoutRealActivationDate: activaciones.filter((activacion) => !activacion.tieneFechaRealActivacion).length,
    companyCounts: [...companyCounts.values()].sort((left, right) =>
      left.empresaNombreArchivo.localeCompare(right.empresaNombreArchivo),
    ),
    facturaciones: importacion.facturaciones.map((facturacion) => serializeFacturacion(facturacion)),
  }
}

export function getActivacionesFilters(params: SearchParamsInput) {
  const anio = numberParam(params, 'anio')
  const mes = numberParam(params, 'mes')
  const empresaId = stringParam(params, 'empresaId')
  const importacionId = stringParam(params, 'importacionId')
  const mid = stringParam(params, 'mid')
  const chip = stringParam(params, 'chip')
  const lote = stringParam(params, 'lote')
  const estadoActivacion = stringParam(params, 'estadoActivacion')
  const activacionCompletada = stringParam(params, 'activacionCompletada')

  const hasFilter = Boolean(anio || mes || empresaId || importacionId || mid || chip || lote || estadoActivacion || activacionCompletada)

  const where: Prisma.ActivacionImportadaWhereInput = {
    ...(anio ? { anio } : {}),
    ...(mes ? { mes } : {}),
    ...(empresaId ? { empresaId } : {}),
    ...(importacionId ? { importacionId } : {}),
    ...(mid ? { mid: { contains: mid, mode: 'insensitive' } } : {}),
    ...(chip ? { chip: { contains: chip, mode: 'insensitive' } } : {}),
    ...(lote ? { lote: { contains: lote, mode: 'insensitive' } } : {}),
    ...(estadoActivacion ? { estadoActivacion: { contains: estadoActivacion, mode: 'insensitive' } } : {}),
    ...(activacionCompletada === 'true' ? { tieneFechaRealActivacion: true } : {}),
    ...(activacionCompletada === 'false' ? { tieneFechaRealActivacion: false } : {}),
  }

  return { hasFilter, where }
}

export function serializeActivacion(row: {
  id: string
  importacionId: string
  empresaId: string
  anio: number
  mes: number
  mid: string
  chip: string
  empresa: { id: string; nombre: string }
  empresaNombreArchivo: string
  rawRowJson: Prisma.JsonValue
  lote: string
  estadoActivacion: string
  fechaImportacion: Date
  fechaActivacion: Date | null
  fechaVencimiento?: Date | null
  tieneFechaRealActivacion: boolean
  distribuidor?: Prisma.JsonValue
  fechaAsignacionDistribuidor?: Date | null
}) {
  return {
    id: row.id,
    importacionId: row.importacionId,
    empresaId: row.empresaId,
    anio: row.anio,
    mes: row.mes,
    mid: row.mid,
    chip: row.chip,
    empresa: row.empresa.nombre,
    empresaNombreArchivo: row.empresaNombreArchivo,
    tipoActivacion: rawString(row.rawRowJson, ['Tipo de activación', 'Tipo activación', 'Tipo Activacion']),
    lote: row.lote,
    subLote: rawString(row.rawRowJson, ['Sub-lote', 'Sub lote', 'Sublote']),
    estadoActivacion: row.estadoActivacion,
    fechaImportacion: iso(row.fechaImportacion),
    fechaActivacion: iso(row.fechaActivacion),
    fechaVencimiento: iso((row as { fechaVencimiento?: Date | null }).fechaVencimiento ?? null),
    distribuidor: rawString(row.rawRowJson, ['Distribuidor', 'distribuidor']),
    fechaAsignacionDistribuidor: iso((row as { fechaAsignacionDistribuidor?: Date | null }).fechaAsignacionDistribuidor ?? null),
    situacion: row.tieneFechaRealActivacion ? 'Completada' : 'Sin fecha real',
  }
}

export async function getActivaciones(params: SearchParamsInput) {
  const page = Math.max(numberParam(params, 'page') ?? 1, 1)
  const pageSize = 100
  const skip = (page - 1) * pageSize
  const { hasFilter, where } = getActivacionesFilters(params)

  const empresas = await prisma.empresa.findMany({
    where: { activa: true },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true },
  })

  if (!hasFilter) {
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 0,
      filters: { empresas },
    }
  }

  const [total, rows] = await Promise.all([
    prisma.activacionImportada.count({ where }),
    prisma.activacionImportada.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { empresaNombreArchivo: 'asc' }, { creadaEn: 'asc' }],
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    }),
  ])

  return {
    data: rows.map((row) => serializeActivacion(row)),
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
    filters: { empresas },
  }
}

export async function getFacturacion(params: SearchParamsInput) {
  const { where } = getBillingFilters(params)
  const effectiveWhere = activeBillingWhere(where, params)

  const [rows, empresas, estadosCobro] = await Promise.all([
    prisma.facturacionMensual.findMany({
      where: effectiveWhere,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { empresa: { nombre: 'asc' } }],
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
        estadoCobro: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        importacion: {
          select: {
            estado: true,
            anuladaEn: true,
          },
        },
      },
    }),
    prisma.empresa.findMany({
      where: { activa: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
      },
    }),
    prisma.estadoCobro.findMany({
      orderBy: { codigo: 'asc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
      },
    }),
  ])

  const closedPeriods = await getClosedPeriodKeys(rows.map((row) => ({ anio: row.anio, mes: row.mes })))

  return {
    rows: rows.map((row) => ({
      ...serializeFacturacion(row),
      periodoCerrado: closedPeriods.has(periodKey(row.anio, row.mes)),
    })),
    filters: {
      empresas,
      estadosCobro,
    },
  }
}

export async function getCobros(params: SearchParamsInput) {
  const { where } = getBillingFilters(params)
  const effectiveWhere = activeBillingWhere(where, params)
  const [facturacion, resumen] = await Promise.all([getFacturacion(params), getCobrosResumenForWhere(effectiveWhere)])

  return {
    ...facturacion,
    resumen,
  }
}

export async function getCobrosResumen(params: SearchParamsInput) {
  const { where } = getBillingFilters(params)
  return getCobrosResumenForWhere(activeBillingWhere(where, params))
}

async function getCobrosResumenForWhere(where: Prisma.FacturacionMensualWhereInput) {
  const pendingWhere: Prisma.FacturacionMensualWhereInput = {
    AND: [
      where,
      {
        estadoCobro: {
          codigo: {
            in: ['FACTURADO'],
          },
        },
      },
    ],
  }
  const pendingRows = await prisma.facturacionMensual.findMany({
    where: pendingWhere,
    select: {
      empresaId: true,
      anio: true,
      mes: true,
      totalSinIva: true,
      totalConIva: true,
    },
  })

  const totalPendienteSinIva = pendingRows.reduce(
    (total, row) => total.add(row.totalSinIva),
    new Prisma.Decimal(0),
  )
  const totalPendienteConIva = pendingRows.reduce(
    (total, row) => total.add(row.totalConIva),
    new Prisma.Decimal(0),
  )

  return {
    totalPendienteSinIva: money(totalPendienteSinIva),
    totalPendienteConIva: money(totalPendienteConIva),
    empresasConDeuda: new Set(pendingRows.map((row) => row.empresaId)).size,
    periodosPendientes: new Set(pendingRows.map((row) => `${row.anio}-${row.mes}`)).size,
  }
}

export async function getFacturacionActivaciones(id: string, params: SearchParamsInput) {
  const facturacion = await prisma.facturacionMensual.findUnique({
    where: { id },
    select: {
      id: true,
      importacionId: true,
      empresaId: true,
      anio: true,
      mes: true,
    },
  })

  if (!facturacion) {
    return null
  }

  const activaciones = await getActivaciones({
    ...Object.fromEntries(params instanceof URLSearchParams ? params.entries() : Object.entries(params)),
    importacionId: facturacion.importacionId,
    empresaId: facturacion.empresaId,
    anio: String(facturacion.anio),
    mes: String(facturacion.mes),
  })

  return {
    facturacionId: facturacion.id,
    ...activaciones,
  }
}

type FacturacionWithRelations = {
  id: string
  importacionId: string
  empresaId: string
  empresa: { nombre: string }
  anio: number
  mes: number
  cantidadActivaciones: number
  precioUnitario: Prisma.Decimal
  porcentajeIva: Prisma.Decimal
  totalSinIva: Prisma.Decimal
  iva: Prisma.Decimal
  totalConIva: Prisma.Decimal
  estadoCobroId: string
  estadoCobro: { codigo: string; nombre: string }
  fechaCobro: Date | null
  observaciones: string | null
  creadaEn: Date
  importacion?: {
    estado: string
    anuladaEn: Date | null
  }
}

function serializeFacturacion(facturacion: FacturacionWithRelations) {
  return {
    id: facturacion.id,
    importacionId: facturacion.importacionId,
    empresaId: facturacion.empresaId,
    empresa: facturacion.empresa.nombre,
    anio: facturacion.anio,
    mes: facturacion.mes,
    cantidadFacturable: facturacion.cantidadActivaciones,
    precioUnitario: money(facturacion.precioUnitario),
    porcentajeIva: rate(facturacion.porcentajeIva),
    subtotal: money(facturacion.totalSinIva),
    iva: money(facturacion.iva),
    total: money(facturacion.totalConIva),
    estadoCobroId: facturacion.estadoCobroId,
    estadoCobro: facturacion.estadoCobro.codigo,
    estadoCobroNombre: facturacion.estadoCobro.nombre,
    fechaCobro: iso(facturacion.fechaCobro),
    observaciones: facturacion.observaciones,
    creadaEn: iso(facturacion.creadaEn),
    importacionEstado: facturacion.importacion?.estado ?? null,
    importacionAnulada: facturacion.importacion?.estado === 'ANULADA' || Boolean(facturacion.importacion?.anuladaEn),
  }
}
