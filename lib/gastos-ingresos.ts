import { Prisma } from '@prisma/client'

import { handlePrismaLibError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { closedPeriodError, isPeriodClosed } from '@/lib/periods'
import type { SearchParamsInput } from '@/lib/read-models'

const CONCEPTO_TIPOS = new Set(['FIJO', 'VARIABLE'])
const INGRESO_MONEDAS = new Set(['UYU', 'USD'])
const FUENTES_TIPO_CAMBIO = new Set(['MANUAL', 'BCU', 'PARAMETRO'])

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

function numberParam(params: SearchParamsInput, key: string) {
  const value = stringParam(params, key)
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
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

function requiredString(body: Record<string, unknown>, key: string) {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalString(body: Record<string, unknown>, key: string) {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function requiredInt(body: Record<string, unknown>, key: string) {
  const value = body[key]
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isInteger(parsed) ? parsed : null
}

function requiredDecimal(body: Record<string, unknown>, key: string) {
  const value = body[key]

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  try {
    const decimal = new Prisma.Decimal(value)
    return decimal.greaterThanOrEqualTo(0) ? decimal : null
  } catch {
    return null
  }
}

function optionalDecimal(body: Record<string, unknown>, key: string) {
  const value = body[key]

  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  try {
    return new Prisma.Decimal(value)
  } catch {
    return null
  }
}

function requiredDate(body: Record<string, unknown>, key: string) {
  const value = body[key]

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date
}

async function assertOpenPeriod(anio: number, mes: number) {
  if (await isPeriodClosed(anio, mes)) {
    return closedPeriodError('El período ya está cerrado. No se pueden modificar datos del período.')
  }

  return null
}

export async function getGastoConceptos() {
  const rows = await prisma.gastoConcepto.findMany({
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
  })

  return {
    rows: rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo,
      monto: row.monto?.toString() ?? null,
      activo: row.activo,
    })),
  }
}

export async function createGastoConcepto(body: Record<string, unknown>) {
  const nombre = requiredString(body, 'nombre')
  const tipo = requiredString(body, 'tipo') ?? 'VARIABLE'
  const montoRaw = body.monto !== undefined && body.monto !== '' ? body.monto : null

  if (!nombre || !CONCEPTO_TIPOS.has(tipo)) {
    return { error: { error: 'CONCEPTO_INVALIDO', message: 'Nombre y tipo valido son requeridos.' }, status: 422 }
  }

  let monto: Prisma.Decimal | null = null
  if (tipo === 'FIJO' && montoRaw !== null) {
    try {
      monto = new Prisma.Decimal(String(montoRaw))
    } catch {
      return { error: { error: 'MONTO_INVALIDO', message: 'El monto debe ser un número válido.' }, status: 422 }
    }
  }

  try {
    const concepto = await prisma.$transaction(async (tx) => {
      const created = await tx.gastoConcepto.create({
        data: { nombre, tipo, monto },
      })

      await tx.auditoria.create({
        data: {
          entidad: 'GastoConcepto',
          entidadId: created.id,
          accion: 'CREAR_CONCEPTO_GASTO',
          detalle: { nombre, tipo, monto: monto?.toString() ?? null },
        },
      })

      return created
    })

    return {
      data: { id: concepto.id, nombre: concepto.nombre, tipo: concepto.tipo, monto: concepto.monto?.toString() ?? null, activo: concepto.activo },
      status: 201,
    }
  } catch (err) {
    return handlePrismaLibError(err, { nombre: 'nombre' })
  }
}

export async function updateGastoConcepto(id: string, body: Record<string, unknown>) {
  const nombre = requiredString(body, 'nombre')
  const tipo = requiredString(body, 'tipo')
  const activo = typeof body.activo === 'boolean' ? body.activo : undefined
  const montoRaw = body.monto !== undefined && body.monto !== '' ? body.monto : null

  if (!tipo || !CONCEPTO_TIPOS.has(tipo)) {
    return { error: { error: 'CONCEPTO_INVALIDO', message: 'Tipo válido es requerido.' }, status: 422 }
  }

  let monto: Prisma.Decimal | null = null
  if (tipo === 'FIJO' && montoRaw !== null) {
    try {
      monto = new Prisma.Decimal(String(montoRaw))
    } catch {
      return { error: { error: 'MONTO_INVALIDO', message: 'El monto debe ser un número válido.' }, status: 422 }
    }
  }

  const current = await prisma.gastoConcepto.findUnique({ where: { id }, select: { nombre: true } })
  const data: Prisma.GastoConceptoUpdateInput = {
    tipo,
    monto,
    ...(activo === undefined ? {} : { activo }),
    ...(nombre && nombre !== current?.nombre ? { nombre } : {}),
  }

  try {
    const concepto = await prisma.$transaction(async (tx) => {
      const updated = await tx.gastoConcepto.update({ where: { id }, data })

      await tx.auditoria.create({
        data: {
          entidad: 'GastoConcepto',
          entidadId: id,
          accion: 'EDITAR_CONCEPTO_GASTO',
          detalle: { nombre, tipo, monto: monto?.toString() ?? null, activo },
        },
      })

      return updated
    })

    return {
      data: { id: concepto.id, nombre: concepto.nombre, tipo: concepto.tipo, monto: concepto.monto?.toString() ?? null, activo: concepto.activo },
      status: 200,
    }
  } catch (err) {
    return handlePrismaLibError(err, { nombre: 'nombre' })
  }
}

export async function deactivateGastoConcepto(id: string) {
  const concepto = await prisma.$transaction(async (tx) => {
    const updated = await tx.gastoConcepto.update({
      where: { id },
      data: { activo: false },
    })

    await tx.auditoria.create({
      data: {
        entidad: 'GastoConcepto',
        entidadId: id,
        accion: 'DESACTIVAR_CONCEPTO_GASTO',
        detalle: { nombre: updated.nombre },
      },
    })

    return updated
  })

  return { data: concepto, status: 200 }
}

export async function getGastos(params: SearchParamsInput) {
  const anio = numberParam(params, 'anio')
  const mes = numberParam(params, 'mes')
  const conceptoId = stringParam(params, 'conceptoId') ?? stringParam(params, 'concepto')
  const tipo = stringParam(params, 'tipo')
  const where: Prisma.GastoMensualWhereInput = {
    ...(anio ? { anio } : {}),
    ...(mes ? { mes } : {}),
    ...(conceptoId ? { conceptoId } : {}),
    ...(tipo ? { concepto: { tipo } } : {}),
  }

  const [rows, conceptos] = await Promise.all([
    prisma.gastoMensual.findMany({
      where,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { fecha: 'desc' }],
      include: { concepto: true },
    }),
    prisma.gastoConcepto.findMany({ orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] }),
  ])
  const total = rows.reduce((acc, row) => acc.add(row.importe), new Prisma.Decimal(0))
  const totalFijos = rows
    .filter((row) => row.concepto.tipo === 'FIJO')
    .reduce((acc, row) => acc.add(row.importe), new Prisma.Decimal(0))
  const totalVariables = rows
    .filter((row) => row.concepto.tipo === 'VARIABLE')
    .reduce((acc, row) => acc.add(row.importe), new Prisma.Decimal(0))

  const periodoCerrado = anio && mes ? await isPeriodClosed(anio, mes) : false

  return {
    rows: rows.map(serializeGasto),
    conceptos: conceptos.map(serializeConcepto),
    periodoCerrado,
    resumen: {
      totalGastosMes: money(total),
      totalGastosFijos: money(totalFijos),
      totalGastosVariables: money(totalVariables),
      cantidadGastos: rows.length,
    },
  }
}

export async function createGasto(body: Record<string, unknown>) {
  const parsed = parseGastoBody(body)
  if ('error' in parsed) return parsed

  const closed = await assertOpenPeriod(parsed.data.anio, parsed.data.mes)
  if (closed) return { error: closedPeriodError('El período ya está cerrado. No se pueden modificar gastos.'), status: 409 }

  const gasto = await prisma.$transaction(async (tx) => {
    const created = await tx.gastoMensual.create({ data: parsed.data, include: { concepto: true } })
    await tx.auditoria.create({
      data: {
        entidad: 'GastoMensual',
        entidadId: created.id,
        accion: 'CREAR_GASTO',
        detalle: serializeGasto(created),
      },
    })
    return created
  })

  return { data: serializeGasto(gasto), status: 201 }
}

export async function updateGasto(id: string, body: Record<string, unknown>) {
  const parsed = parseGastoBody(body)
  if ('error' in parsed) return parsed

  const existing = await prisma.gastoMensual.findUnique({ where: { id }, include: { concepto: true } })
  if (!existing) return { error: { error: 'NOT_FOUND', message: 'No se encontró el gasto.' }, status: 404 }

  const closed = await assertOpenPeriod(parsed.data.anio, parsed.data.mes)
  if (closed) return { error: closedPeriodError('El período ya está cerrado. No se pueden modificar gastos.'), status: 409 }

  const gasto = await prisma.$transaction(async (tx) => {
    const updated = await tx.gastoMensual.update({ where: { id }, data: parsed.data, include: { concepto: true } })
    await tx.auditoria.create({
      data: {
        entidad: 'GastoMensual',
        entidadId: id,
        accion: 'EDITAR_GASTO',
        detalle: {
          anterior: serializeGasto(existing),
          nuevo: serializeGasto(updated),
        },
      },
    })
    return updated
  })

  return { data: serializeGasto(gasto), status: 200 }
}

export async function deleteGasto(id: string) {
  const existing = await prisma.gastoMensual.findUnique({ where: { id }, include: { concepto: true } })
  if (!existing) return { error: { error: 'NOT_FOUND', message: 'No se encontró el gasto.' }, status: 404 }

  const closed = await assertOpenPeriod(existing.anio, existing.mes)
  if (closed) return { error: closedPeriodError('El período ya está cerrado. No se pueden modificar gastos.'), status: 409 }

  await prisma.$transaction(async (tx) => {
    await tx.gastoMensual.delete({ where: { id } })
    await tx.auditoria.create({
      data: {
        entidad: 'GastoMensual',
        entidadId: id,
        accion: 'ELIMINAR_GASTO',
        detalle: serializeGasto(existing),
      },
    })
  })

  return { data: { id }, status: 200 }
}

export async function getIngresosAdicionales(params: SearchParamsInput) {
  const anio = numberParam(params, 'anio')
  const mes = numberParam(params, 'mes')
  const empresaId = stringParam(params, 'empresaId')
  const where: Prisma.IngresoAdicionalWhereInput = {
    ...(anio ? { anio } : {}),
    ...(mes ? { mes } : {}),
    ...(empresaId ? { empresaId } : {}),
  }

  const [rows, empresas] = await Promise.all([
    prisma.ingresoAdicional.findMany({
      where,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { creadoEn: 'desc' }],
      include: { empresa: true },
    }),
    prisma.empresa.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
  ])

  const periodoCerrado = anio && mes ? await isPeriodClosed(anio, mes) : false

  return {
    rows: rows.map(serializeIngreso),
    empresas,
    periodoCerrado,
  }
}

export async function createIngresoAdicional(body: Record<string, unknown>) {
  const parsed = parseIngresoBody(body)
  if ('error' in parsed) return parsed

  const closed = await assertOpenPeriod(parsed.data.anio, parsed.data.mes)
  if (closed) return { error: closedPeriodError('El período ya está cerrado. No se pueden modificar ingresos adicionales.'), status: 409 }

  const ingreso = await prisma.$transaction(async (tx) => {
    const created = await tx.ingresoAdicional.create({
      data: parsed.data as unknown as Prisma.IngresoAdicionalUncheckedCreateInput,
      include: { empresa: true },
    })
    await tx.auditoria.create({
      data: {
        entidad: 'IngresoAdicional',
        entidadId: created.id,
        accion: 'CREAR_INGRESO_ADICIONAL',
        detalle: serializeIngreso(created),
      },
    })
    return created
  })

  return { data: serializeIngreso(ingreso), status: 201 }
}

export async function updateIngresoAdicional(id: string, body: Record<string, unknown>) {
  const parsed = parseIngresoBody(body)
  if ('error' in parsed) return parsed

  const existing = await prisma.ingresoAdicional.findUnique({ where: { id }, include: { empresa: true } })
  if (!existing) return { error: { error: 'NOT_FOUND', message: 'No se encontró el ingreso adicional.' }, status: 404 }

  const closed = await assertOpenPeriod(parsed.data.anio, parsed.data.mes)
  if (closed) return { error: closedPeriodError('El período ya está cerrado. No se pueden modificar ingresos adicionales.'), status: 409 }

  const ingreso = await prisma.$transaction(async (tx) => {
    const updated = await tx.ingresoAdicional.update({
      where: { id },
      data: parsed.data as unknown as Prisma.IngresoAdicionalUncheckedUpdateInput,
      include: { empresa: true },
    })
    await tx.auditoria.create({
      data: {
        entidad: 'IngresoAdicional',
        entidadId: id,
        accion: 'EDITAR_INGRESO_ADICIONAL',
        detalle: {
          anterior: serializeIngreso(existing),
          nuevo: serializeIngreso(updated),
        },
      },
    })
    return updated
  })

  return { data: serializeIngreso(ingreso), status: 200 }
}

export async function deleteIngresoAdicional(id: string) {
  const existing = await prisma.ingresoAdicional.findUnique({ where: { id }, include: { empresa: true } })
  if (!existing) return { error: { error: 'NOT_FOUND', message: 'No se encontró el ingreso adicional.' }, status: 404 }

  const closed = await assertOpenPeriod(existing.anio, existing.mes)
  if (closed) return { error: closedPeriodError('El período ya está cerrado. No se pueden modificar ingresos adicionales.'), status: 409 }

  await prisma.$transaction(async (tx) => {
    await tx.ingresoAdicional.delete({ where: { id } })
    await tx.auditoria.create({
      data: {
        entidad: 'IngresoAdicional',
        entidadId: id,
        accion: 'ELIMINAR_INGRESO_ADICIONAL',
        detalle: serializeIngreso(existing),
      },
    })
  })

  return { data: { id }, status: 200 }
}

function parseGastoBody(body: Record<string, unknown>) {
  const conceptoId = requiredString(body, 'conceptoId')
  const anio = requiredInt(body, 'anio')
  const mes = requiredInt(body, 'mes')
  const fecha = requiredDate(body, 'fecha')
  const importe = requiredDecimal(body, 'importe')
  const observaciones = optionalString(body, 'observaciones')

  if (!conceptoId || !anio || !mes || mes < 1 || mes > 12 || !fecha || !importe) {
    return { error: { error: 'GASTO_INVALIDO', message: 'Datos de gasto invalidos.' }, status: 422 }
  }

  return { data: { conceptoId, anio, mes, fecha, importe, observaciones } }
}

function parseIngresoBody(body: Record<string, unknown>) {
  const concepto = requiredString(body, 'concepto')
  const empresaId = optionalString(body, 'empresaId')
  const anio = requiredInt(body, 'anio')
  const mes = requiredInt(body, 'mes')
  const moneda = requiredString(body, 'moneda') ?? 'UYU'
  const montoOrigen = requiredDecimal(body, 'montoOrigen') ?? requiredDecimal(body, 'montoSinIva')
  const fechaFacturacion = requiredDate(body, 'fechaFacturacion')
  const tipoCambioAplicado = optionalDecimal(body, 'tipoCambioAplicado')
  const fuenteTipoCambio = optionalString(body, 'fuenteTipoCambio')
  const fechaTipoCambio = requiredDate(body, 'fechaTipoCambio')
  const porcentajeIva = requiredDecimal(body, 'porcentajeIva')
  const observaciones = optionalString(body, 'observaciones')

  if (
    !concepto ||
    !anio ||
    !mes ||
    mes < 1 ||
    mes > 12 ||
    !INGRESO_MONEDAS.has(moneda) ||
    !montoOrigen ||
    !fechaFacturacion ||
    !porcentajeIva
  ) {
    return { error: { error: 'INGRESO_ADICIONAL_INVALIDO', message: 'Datos de ingreso adicional invalidos.' }, status: 422 }
  }

  if (fuenteTipoCambio && !FUENTES_TIPO_CAMBIO.has(fuenteTipoCambio)) {
    return { error: { error: 'FUENTE_TIPO_CAMBIO_INVALIDA', message: 'La fuente de tipo de cambio no es valida.' }, status: 422 }
  }

  if (moneda === 'USD' && (!tipoCambioAplicado || tipoCambioAplicado.lessThanOrEqualTo(0))) {
    return {
      error: {
        error: 'TIPO_CAMBIO_REQUERIDO',
        message: 'Los ingresos en USD requieren un tipo de cambio aplicado mayor a 0 para la fecha de facturacion.',
      },
      status: 422,
    }
  }

  const montoSinIva =
    moneda === 'USD' ? montoOrigen.mul(tipoCambioAplicado as Prisma.Decimal).toDecimalPlaces(2) : montoOrigen.toDecimalPlaces(2)
  const iva = montoSinIva.mul(porcentajeIva).toDecimalPlaces(2)
  const montoConIva = montoSinIva.add(iva).toDecimalPlaces(2)
  const normalizedTipoCambio = moneda === 'USD' ? tipoCambioAplicado : tipoCambioAplicado ?? new Prisma.Decimal(1)
  const normalizedFuente = moneda === 'USD' ? fuenteTipoCambio ?? 'MANUAL' : fuenteTipoCambio
  const normalizedFechaTipoCambio = moneda === 'USD' ? fechaTipoCambio ?? fechaFacturacion : fechaTipoCambio

  return {
    data: {
      concepto,
      empresaId,
      anio,
      mes,
      moneda,
      montoOrigen: montoOrigen.toDecimalPlaces(2),
      fechaFacturacion,
      tipoCambioAplicado: normalizedTipoCambio,
      fuenteTipoCambio: normalizedFuente,
      fechaTipoCambio: normalizedFechaTipoCambio,
      montoSinIva,
      porcentajeIva,
      iva,
      montoConIva,
      observaciones,
    },
  }
}

function serializeConcepto(row: { id: string; nombre: string; tipo: string; monto?: { toString(): string } | null; activo: boolean }) {
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    monto: row.monto?.toString() ?? null,
    activo: row.activo,
  }
}

function serializeGasto(row: Prisma.GastoMensualGetPayload<{ include: { concepto: true } }>) {
  return {
    id: row.id,
    conceptoId: row.conceptoId,
    concepto: row.concepto.nombre,
    tipo: row.concepto.tipo,
    anio: row.anio,
    mes: row.mes,
    fecha: iso(row.fecha),
    importe: money(row.importe),
    observaciones: row.observaciones,
  }
}

function serializeIngreso(row: Prisma.IngresoAdicionalGetPayload<{ include: { empresa: true } }>) {
  const ingreso = row as unknown as {
    moneda?: string
    montoOrigen?: Prisma.Decimal
    fechaFacturacion?: Date
    tipoCambioAplicado?: Prisma.Decimal | null
    fuenteTipoCambio?: string | null
    fechaTipoCambio?: Date | null
  }

  return {
    id: row.id,
    concepto: row.concepto,
    empresaId: row.empresaId,
    empresa: row.empresa?.nombre ?? null,
    anio: row.anio,
    mes: row.mes,
    moneda: ingreso.moneda ?? 'UYU',
    montoOrigen: ingreso.montoOrigen ? money(ingreso.montoOrigen) : money(row.montoSinIva),
    fechaFacturacion: iso(ingreso.fechaFacturacion ?? row.creadoEn),
    tipoCambioAplicado: ingreso.tipoCambioAplicado ? rate(ingreso.tipoCambioAplicado) : null,
    fuenteTipoCambio: ingreso.fuenteTipoCambio ?? null,
    fechaTipoCambio: iso(ingreso.fechaTipoCambio),
    montoSinIva: money(row.montoSinIva),
    porcentajeIva: rate(row.porcentajeIva),
    iva: money(row.iva),
    montoConIva: money(row.montoConIva),
    observaciones: row.observaciones,
    creadoEn: iso(row.creadoEn),
  }
}
