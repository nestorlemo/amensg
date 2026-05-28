import { Prisma } from '@prisma/client'

import { getGastos, getIngresosAdicionales } from '@/lib/gastos-ingresos'
import { buildLiquidacionPreview, getCierres } from '@/lib/liquidaciones'
import { prisma } from '@/lib/prisma'
import { getActivaciones, getCobros, getFacturacion, type SearchParamsInput } from '@/lib/read-models'

export type ReportSlug =
  | 'mensual-empresa'
  | 'activaciones'
  | 'facturacion'
  | 'cobros-pendientes'
  | 'gastos'
  | 'ingresos-adicionales'
  | 'liquidacion'

export type ReportFilterKey = 'anio' | 'mes' | 'empresaId' | 'estado'

export type ReportFilters = {
  anio?: string
  mes?: string
  empresaId?: string
  estado?: string
}

export type ReportPreview = {
  title: string
  description: string
  filters: ReportFilters
  filterOptions: {
    empresas: Array<{ id: string; nombre: string }>
    estadosCobro: Array<{ codigo: string; nombre: string }>
  }
  enabledFilters: ReportFilterKey[]
  metrics: Array<{ label: string; value: string | number }>
  columns: string[]
  rows: Array<Array<string | number | null>>
  exportPath: string
  note?: string
}

const reportConfig: Record<ReportSlug, { title: string; description: string; enabledFilters: ReportFilterKey[] }> = {
  'mensual-empresa': {
    title: 'Mensual por empresa',
    description: 'Resumen mensual por empresa con activaciones facturables, facturacion e ingresos adicionales.',
    enabledFilters: ['anio', 'mes', 'empresaId'],
  },
  activaciones: {
    title: 'Activaciones',
    description: 'Vista previa de activaciones importadas con filtros operativos. Muestra hasta 100 filas.',
    enabledFilters: ['anio', 'mes', 'empresaId'],
  },
  facturacion: {
    title: 'Facturacion',
    description: 'Resumen de facturacion mensual por empresa con estados de cobro.',
    enabledFilters: ['anio', 'mes', 'empresaId', 'estado'],
  },
  'cobros-pendientes': {
    title: 'Cobros pendientes',
    description: 'Facturaciones pendientes o enviadas, excluyendo cobros ya pagados y anulados.',
    enabledFilters: ['anio', 'mes', 'empresaId'],
  },
  gastos: {
    title: 'Gastos',
    description: 'Detalle de gastos mensuales y totales por tipo.',
    enabledFilters: ['anio', 'mes'],
  },
  'ingresos-adicionales': {
    title: 'Ingresos adicionales',
    description: 'Detalle de ingresos adicionales con montos expresados en UYU.',
    enabledFilters: ['anio', 'mes', 'empresaId'],
  },
  liquidacion: {
    title: 'Liquidacion / cierre',
    description: 'Preview del periodo abierto o snapshot del cierre cuando el periodo esta cerrado.',
    enabledFilters: ['anio', 'mes'],
  },
}

function param(params: SearchParamsInput, key: string) {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined
  }

  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function stringParam(params: SearchParamsInput, key: string) {
  const value = param(params, key)?.trim()
  return value ? value : undefined
}

function intParam(params: SearchParamsInput, key: string) {
  const value = stringParam(params, key)
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

function decimalFrom(value: string | number | null | undefined) {
  return new Prisma.Decimal(value ?? 0)
}

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-UY').format(new Date(value)) : ''
}

function periodLabel(anio: number, mes: number) {
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function buildExportPath(slug: ReportSlug, params: SearchParamsInput) {
  const query = new URLSearchParams()
  for (const key of reportConfig[slug].enabledFilters) {
    const value = stringParam(params, key)
    if (value) query.set(key, value)
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return `/api/reportes/${slug}/export${suffix}`
}

export async function getReportFilterOptions() {
  const [empresas, estadosCobro] = await Promise.all([
    prisma.empresa.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
    prisma.estadoCobro.findMany({ orderBy: { codigo: 'asc' }, select: { codigo: true, nombre: true } }),
  ])

  return { empresas, estadosCobro }
}

export async function getReportPreview(slug: ReportSlug, params: SearchParamsInput): Promise<ReportPreview> {
  const filters = {
    anio: stringParam(params, 'anio'),
    mes: stringParam(params, 'mes'),
    empresaId: stringParam(params, 'empresaId'),
    estado: stringParam(params, 'estado'),
  }
  const filterOptions = await getReportFilterOptions()

  if (slug === 'mensual-empresa') {
    const preview = await getMensualEmpresaPreview(params)
    return { ...reportConfig[slug], filters, filterOptions, exportPath: buildExportPath(slug, params), ...preview }
  }

  if (slug === 'activaciones') {
    const data = await getActivaciones({ ...objectParams(params), pageSize: '100', page: stringParam(params, 'page') ?? '1' })
    return {
      ...reportConfig[slug],
      filters,
      filterOptions,
      exportPath: buildExportPath(slug, params),
      metrics: [
        { label: 'Total activaciones', value: data.pagination.total },
        { label: 'Filas en preview', value: data.rows.length },
      ],
      columns: ['Empresa', 'Periodo', 'MID', 'Chip', 'Lote', 'Estado', 'Fecha importacion', 'Fecha activacion', 'Situacion'],
      rows: data.rows.map((row) => [
        row.empresa,
        periodLabel(row.anio, row.mes),
        row.mid,
        row.chip,
        row.lote,
        row.estadoActivacion,
        formatDate(row.fechaImportacion),
        formatDate(row.fechaActivacion),
        row.situacion,
      ]),
      note: 'La vista previa muestra hasta 100 filas para mantener la pantalla liviana.',
    }
  }

  if (slug === 'facturacion') {
    const data = await getFacturacion(params)
    const subtotal = data.rows.reduce((acc, row) => acc.add(decimalFrom(row.subtotal)), new Prisma.Decimal(0))
    const iva = data.rows.reduce((acc, row) => acc.add(decimalFrom(row.iva)), new Prisma.Decimal(0))
    const total = data.rows.reduce((acc, row) => acc.add(decimalFrom(row.total)), new Prisma.Decimal(0))
    return {
      ...reportConfig[slug],
      filters,
      filterOptions,
      exportPath: buildExportPath(slug, params),
      metrics: [
        { label: 'Facturacion sin IVA', value: money(subtotal) },
        { label: 'IVA', value: money(iva) },
        { label: 'Facturacion con IVA', value: money(total) },
        { label: 'Empresas', value: new Set(data.rows.map((row) => row.empresaId)).size },
      ],
      columns: ['Empresa', 'Periodo', 'Activaciones', 'Precio unitario', 'Subtotal', 'IVA', 'Total', 'Estado cobro', 'Fecha cobro'],
      rows: data.rows.map((row) => [
        row.empresa,
        periodLabel(row.anio, row.mes),
        row.cantidadFacturable,
        row.precioUnitario,
        row.subtotal,
        row.iva,
        row.total,
        row.estadoCobroNombre,
        formatDate(row.fechaCobro),
      ]),
    }
  }

  if (slug === 'cobros-pendientes') {
    const data = await getCobros({ ...objectParams(params), estado: undefined, estadoCobro: undefined })
    const pendingRows = data.rows.filter((row) => ['PENDIENTE', 'ENVIADO'].includes(row.estadoCobro))
    const subtotal = pendingRows.reduce((acc, row) => acc.add(decimalFrom(row.subtotal)), new Prisma.Decimal(0))
    const total = pendingRows.reduce((acc, row) => acc.add(decimalFrom(row.total)), new Prisma.Decimal(0))
    return {
      ...reportConfig[slug],
      filters,
      filterOptions,
      exportPath: buildExportPath(slug, params),
      metrics: [
        { label: 'Pendiente sin IVA', value: money(subtotal) },
        { label: 'Pendiente con IVA', value: money(total) },
        { label: 'Empresas con deuda', value: new Set(pendingRows.map((row) => row.empresaId)).size },
        { label: 'Filas pendientes', value: pendingRows.length },
      ],
      columns: ['Empresa', 'Periodo', 'Subtotal', 'IVA', 'Total', 'Estado', 'Fecha cobro'],
      rows: pendingRows.map((row) => [
        row.empresa,
        periodLabel(row.anio, row.mes),
        row.subtotal,
        row.iva,
        row.total,
        row.estadoCobroNombre,
        formatDate(row.fechaCobro),
      ]),
    }
  }

  if (slug === 'gastos') {
    const data = await getGastos(params)
    return {
      ...reportConfig[slug],
      filters,
      filterOptions,
      exportPath: buildExportPath(slug, params),
      metrics: [
        { label: 'Total gastos', value: data.resumen.totalGastosMes },
        { label: 'Gastos fijos', value: data.resumen.totalGastosFijos },
        { label: 'Gastos variables', value: data.resumen.totalGastosVariables },
        { label: 'Cantidad', value: data.resumen.cantidadGastos },
      ],
      columns: ['Concepto', 'Tipo', 'Periodo', 'Fecha', 'Importe', 'Observaciones'],
      rows: data.rows.map((row) => [row.concepto, row.tipo, periodLabel(row.anio, row.mes), formatDate(row.fecha), row.importe, row.observaciones ?? '']),
    }
  }

  if (slug === 'ingresos-adicionales') {
    const data = await getIngresosAdicionales(params)
    const sinIva = data.rows.reduce((acc, row) => acc.add(decimalFrom(row.montoSinIva)), new Prisma.Decimal(0))
    const iva = data.rows.reduce((acc, row) => acc.add(decimalFrom(row.iva)), new Prisma.Decimal(0))
    const conIva = data.rows.reduce((acc, row) => acc.add(decimalFrom(row.montoConIva)), new Prisma.Decimal(0))
    return {
      ...reportConfig[slug],
      filters,
      filterOptions,
      exportPath: buildExportPath(slug, params),
      metrics: [
        { label: 'Total sin IVA UYU', value: money(sinIva) },
        { label: 'IVA UYU', value: money(iva) },
        { label: 'Total con IVA UYU', value: money(conIva) },
        { label: 'Cantidad', value: data.rows.length },
      ],
      columns: ['Concepto', 'Empresa', 'Periodo', 'Moneda origen', 'Monto origen', 'Sin IVA UYU', 'IVA UYU', 'Con IVA UYU'],
      rows: data.rows.map((row) => [
        row.concepto,
        row.empresa ?? 'Sin empresa',
        periodLabel(row.anio, row.mes),
        row.moneda,
        row.montoOrigen,
        row.montoSinIva,
        row.iva,
        row.montoConIva,
      ]),
    }
  }

  const liquidation = await getLiquidacionPreview(params)
  return { ...reportConfig[slug], filters, filterOptions, exportPath: buildExportPath(slug, params), ...liquidation }
}

async function getMensualEmpresaPreview(params: SearchParamsInput) {
  const anio = intParam(params, 'anio')
  const mes = intParam(params, 'mes')
  const empresaId = stringParam(params, 'empresaId')
  const [facturacion, ingresos] = await Promise.all([getFacturacion(params), getIngresosAdicionales(params)])
  const summaries = new Map<string, {
    empresa: string
    periodo: string
    activaciones: number
    facturacionSinIva: Prisma.Decimal
    facturacionIva: Prisma.Decimal
    facturacionConIva: Prisma.Decimal
    ingresosSinIva: Prisma.Decimal
    ingresosConIva: Prisma.Decimal
  }>()

  for (const row of facturacion.rows) {
    const key = row.empresaId
    const current = summaries.get(key) ?? {
      empresa: row.empresa,
      periodo: anio && mes ? periodLabel(anio, mes) : 'Multiples periodos',
      activaciones: 0,
      facturacionSinIva: new Prisma.Decimal(0),
      facturacionIva: new Prisma.Decimal(0),
      facturacionConIva: new Prisma.Decimal(0),
      ingresosSinIva: new Prisma.Decimal(0),
      ingresosConIva: new Prisma.Decimal(0),
    }
    current.activaciones += row.cantidadFacturable
    current.facturacionSinIva = current.facturacionSinIva.add(decimalFrom(row.subtotal))
    current.facturacionIva = current.facturacionIva.add(decimalFrom(row.iva))
    current.facturacionConIva = current.facturacionConIva.add(decimalFrom(row.total))
    summaries.set(key, current)
  }

  for (const row of ingresos.rows) {
    const key = row.empresaId ?? 'sin-empresa'
    if (empresaId && key !== empresaId) continue
    const current = summaries.get(key) ?? {
      empresa: row.empresa ?? 'Sin empresa',
      periodo: anio && mes ? periodLabel(anio, mes) : 'Multiples periodos',
      activaciones: 0,
      facturacionSinIva: new Prisma.Decimal(0),
      facturacionIva: new Prisma.Decimal(0),
      facturacionConIva: new Prisma.Decimal(0),
      ingresosSinIva: new Prisma.Decimal(0),
      ingresosConIva: new Prisma.Decimal(0),
    }
    current.ingresosSinIva = current.ingresosSinIva.add(decimalFrom(row.montoSinIva))
    current.ingresosConIva = current.ingresosConIva.add(decimalFrom(row.montoConIva))
    summaries.set(key, current)
  }

  const rows = [...summaries.values()].sort((left, right) => left.empresa.localeCompare(right.empresa))
  const totalFacturacion = rows.reduce((acc, row) => acc.add(row.facturacionConIva), new Prisma.Decimal(0))
  const totalIngresos = rows.reduce((acc, row) => acc.add(row.ingresosConIva), new Prisma.Decimal(0))

  return {
    metrics: [
      { label: 'Empresas', value: rows.length },
      { label: 'Activaciones', value: rows.reduce((acc, row) => acc + row.activaciones, 0) },
      { label: 'Facturacion con IVA', value: money(totalFacturacion) },
      { label: 'Ingresos adicionales con IVA', value: money(totalIngresos) },
    ],
    columns: ['Empresa', 'Periodo', 'Activaciones facturables', 'Facturacion sin IVA', 'IVA facturacion', 'Facturacion con IVA', 'Ingresos adicionales sin IVA', 'Ingresos adicionales con IVA'],
    rows: rows.map((row) => [
      row.empresa,
      row.periodo,
      row.activaciones,
      money(row.facturacionSinIva),
      money(row.facturacionIva),
      money(row.facturacionConIva),
      money(row.ingresosSinIva),
      money(row.ingresosConIva),
    ]),
  }
}

async function getLiquidacionPreview(params: SearchParamsInput) {
  const anio = intParam(params, 'anio') ?? new Date().getFullYear()
  const mes = intParam(params, 'mes') ?? new Date().getMonth() + 1
  const cierres = await getCierres()
  const cierre = cierres.rows.find((row) => row.anio === anio && row.mes === mes && row.estado === 'CERRADO')

  if (cierre) {
    const detail = await prisma.cierreMensual.findUnique({ where: { id: cierre.id } })
    const snapshot = asRecord(detail?.snapshot)
    const ingresos = asRecord(snapshot.ingresos)
    const gastos = asRecord(snapshot.gastos)
    const resultado = asRecord(snapshot.resultado)
    const socios = arrayRecords(snapshot.socios)

    return {
      metrics: [
        { label: 'Estado', value: 'CERRADO' },
        { label: 'Ingresos sin IVA', value: stringValue(snapshot.totalIngresosSinIva ?? ingresos.totalIngresosSinIva, '0.00') },
        { label: 'Total gastos', value: stringValue(snapshot.totalGastos ?? gastos.totalGastos, '0.00') },
        { label: 'Resultado distribuible', value: stringValue(snapshot.resultadoDistribuible ?? resultado.resultadoDistribuible, '0.00') },
      ],
      columns: ['Socio', 'Porcentaje', 'Monto pesos', 'Monto USD'],
      rows: socios.map((socio) => [
        stringValue(socio.socioNombre, ''),
        `${Number(stringValue(socio.socioPorcentaje, '0')) * 100}%`,
        stringValue(socio.montoPesos, '0.00'),
        stringValue(socio.montoUsd, '0.00'),
      ]),
      note: 'El periodo esta cerrado: la vista usa el snapshot congelado del cierre mensual.',
    }
  }

  const preview = await buildLiquidacionPreview({ anio, mes })
  return {
    metrics: [
      { label: 'Estado', value: 'ABIERTO' },
      { label: 'Ingresos sin IVA', value: preview.ingresos.totalIngresosSinIva },
      { label: 'Total gastos', value: preview.gastos.totalGastos },
      { label: 'Resultado distribuible', value: preview.resultado.resultadoDistribuible },
    ],
    columns: ['Socio', 'Porcentaje', 'Monto pesos', 'Monto USD'],
    rows: preview.socios.map((socio) => [socio.nombre, `${Number(socio.porcentaje) * 100}%`, socio.montoPesos, socio.montoUsd ?? 'Sin tipo de cambio']),
    note: preview.validaciones.length > 0 ? `Validaciones pendientes: ${preview.validaciones.length}` : 'El periodo abierto muestra el preview calculado de liquidacion.',
  }
}

export async function getReportCsv(slug: ReportSlug, params: SearchParamsInput) {
  const preview = await getReportPreview(slug, params)
  return toCsv([preview.columns, ...preview.rows])
}

function toCsv(rows: Array<Array<string | number | null>>) {
  const body = rows.map((row) => row.map(csvCell).join(';')).join('\r\n')
  return `\uFEFF${body}\r\n`
}

function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value)
  const escaped = text.replace(/"/g, '""')
  return /[";\r\n]/.test(escaped) ? `"${escaped}"` : escaped
}

function objectParams(params: SearchParamsInput) {
  if (params instanceof URLSearchParams) {
    return Object.fromEntries(params.entries())
  }
  return { ...params }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function arrayRecords(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}
