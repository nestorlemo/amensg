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
  const anio = numberParam(params, 'anio')
  const mes = numberParam(params, 'mes')
  const estado = stringParam(params, 'estado')
  const where: Prisma.ImportacionActivacionWhereInput = {
    ...(anio ? { anio } : {}),
    ...(mes ? { mes } : {}),
    ...(estado ? { estado } : {}),
  }

  const importaciones = await prisma.importacionActivacion.findMany({
    where,
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadaEn: 'desc' }],
    include: {
      facturaciones: {
        select: {
          empresaId: true,
        },
      },
    },
  })

  const importacionIds = importaciones.map((i) => i.id)
  const counts = importacionIds.length > 0
    ? await prisma.$queryRaw<{ importacion_id: string; total: bigint; completed: bigint; without_real: bigint }[]>`
        SELECT "importacionId" AS importacion_id,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE "tieneFechaRealActivacion" = true) AS completed,
               COUNT(*) FILTER (WHERE "tieneFechaRealActivacion" = false) AS without_real
        FROM "ActivacionImportada"
        WHERE "importacionId" = ANY(${importacionIds}::uuid[])
        GROUP BY "importacionId"
      `
    : []
  const countMap = new Map(counts.map((c) => [c.importacion_id, c]))

  const rows = importaciones.map((importacion) => {
    const c = countMap.get(importacion.id)
    return {
      id: importacion.id,
      anio: importacion.anio,
      mes: importacion.mes,
      nombreArchivo: importacion.nombreArchivo,
      estado: importacion.estado,
      anuladaEn: iso(importacion.anuladaEn),
      motivoAnulacion: importacion.motivoAnulacion,
      totalRows: c ? Number(c.total) : 0,
      companies: new Set(importacion.facturaciones.map((facturacion) => facturacion.empresaId)).size,
      completedActivations: c ? Number(c.completed) : 0,
      withoutRealActivationDate: c ? Number(c.without_real) : 0,
      creadaEn: iso(importacion.creadaEn),
    }
  })

  return { rows }
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

export async function getActivaciones(params: SearchParamsInput) {
  const { page, pageSize, skip, take } = pageParams(params)
  const anio = numberParam(params, 'anio')
  const mes = numberParam(params, 'mes')
  const empresaId = stringParam(params, 'empresaId')
  const importacionId = stringParam(params, 'importacionId')
  const mid = stringParam(params, 'mid')
  const chip = stringParam(params, 'chip')
  const lote = stringParam(params, 'lote')
  const estadoActivacion = stringParam(params, 'estadoActivacion')
  const activacionCompletada = stringParam(params, 'activacionCompletada')
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

  const [total, rows, empresas] = await Promise.all([
    prisma.activacionImportada.count({ where }),
    prisma.activacionImportada.findMany({
      where,
      skip,
      take,
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
    prisma.empresa.findMany({
      where: { activa: true },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
      },
    }),
  ])

  return {
    rows: rows.map((row) => ({
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
      estadoActivacion: row.estadoActivacion,
      fechaImportacion: iso(row.fechaImportacion),
      fechaActivacion: iso(row.fechaActivacion),
      situacion: row.tieneFechaRealActivacion ? 'Completada' : 'Sin fecha real',
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
    filters: {
      empresas,
    },
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
            in: ['PENDIENTE', 'ENVIADO'],
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
