import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const REQUIRED_PARAMETROS = new Set(['precio_unitario_activacion', 'porcentaje_iva', 'tipo_cambio_usd'])

function decimal(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  try {
    return new Prisma.Decimal(String(value).replace(',', '.'))
  } catch {
    return null
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function money(value: Prisma.Decimal) {
  return value.toDecimalPlaces(6).toString()
}

function bool(value: unknown) {
  return value === true || value === 'true' || value === 'on'
}

function cuentasJson(cuentaPesos: string, cuentaUsd: string) {
  const cuentas: Record<string, string> = {}

  if (cuentaPesos) {
    cuentas.cuentaPesos = cuentaPesos
  }

  if (cuentaUsd) {
    cuentas.cuentaUsd = cuentaUsd
  }

  return Object.keys(cuentas).length > 0 ? cuentas : Prisma.JsonNull
}

function cuentasRecord(value: Prisma.JsonValue) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, Prisma.JsonValue>) : {}
}

function validateParametro(clave: string, valor: Prisma.Decimal) {
  if (clave === 'tipo_cambio_usd' && valor.lessThanOrEqualTo(0)) {
    return 'tipo_cambio_usd debe ser mayor a 0.'
  }

  if (clave === 'precio_unitario_activacion' && valor.lessThan(0)) {
    return 'precio_unitario_activacion debe ser mayor o igual a 0.'
  }

  if (clave === 'porcentaje_iva' && valor.lessThan(0)) {
    return 'porcentaje_iva debe ser mayor o igual a 0.'
  }

  return null
}

function parseSocioPercentage(value: unknown) {
  const parsed = decimal(value)

  if (!parsed) {
    return null
  }

  return parsed.greaterThan(1) ? parsed.div(100) : parsed
}

function serializeParametro(parametro: {
  id: string
  clave: string
  valor: Prisma.Decimal
  tipo: string
  descripcion: string | null
  activo: boolean
  actualizado: Date
}) {
  return {
    id: parametro.id,
    clave: parametro.clave,
    valor: money(parametro.valor),
    tipo: parametro.tipo,
    descripcion: parametro.descripcion,
    activo: parametro.activo,
    actualizado: parametro.actualizado.toISOString(),
    critico: REQUIRED_PARAMETROS.has(parametro.clave),
  }
}

function serializeSocio(socio: {
  id: string
  nombre: string
  porcentajeParticipacion: Prisma.Decimal
  cuentas: Prisma.JsonValue
  activo: boolean
  creadoEn: Date
}) {
  const cuentas = cuentasRecord(socio.cuentas)
  return {
    id: socio.id,
    nombre: socio.nombre,
    porcentajeParticipacion: money(socio.porcentajeParticipacion),
    porcentajeDisplay: socio.porcentajeParticipacion.mul(100).toDecimalPlaces(4).toString(),
    cuentaPesos: typeof cuentas.cuentaPesos === 'string' ? cuentas.cuentaPesos : '',
    cuentaUsd: typeof cuentas.cuentaUsd === 'string' ? cuentas.cuentaUsd : '',
    activo: socio.activo,
    creadoEn: socio.creadoEn.toISOString(),
  }
}

export async function getParametros() {
  const parametros = await prisma.parametro.findMany({
    orderBy: [{ clave: 'asc' }],
  })

  return {
    rows: parametros.map(serializeParametro),
    requiredKeys: [...REQUIRED_PARAMETROS],
  }
}

export async function updateParametro(id: string, input: Record<string, unknown>, usuarioId?: string) {
  const existing = await prisma.parametro.findUnique({
    where: { id },
  })

  if (!existing) {
    return { error: { error: 'NOT_FOUND', message: 'Parámetro no encontrado.' }, status: 404 }
  }

  const valor = decimal(input.valor)
  const tipo = text(input.tipo) || 'DECIMAL'
  const descripcion = text(input.descripcion)
  const activo = bool(input.activo)

  if (!valor) {
    return { error: { error: 'PARAMETRO_INVALIDO', message: 'El valor del parámetro debe ser numérico.' }, status: 422 }
  }

  const validation = validateParametro(existing.clave, valor)
  if (validation) {
    return { error: { error: 'PARAMETRO_INVALIDO', message: validation }, status: 422 }
  }

  const parametro = await prisma.$transaction(async (tx) => {
    const updated = await tx.parametro.update({
      where: { id },
      data: {
        valor,
        tipo,
        descripcion: descripcion || null,
        activo,
      },
    })

    await tx.auditoria.create({
      data: {
        entidad: 'Parametro',
        entidadId: id,
        usuarioId,
        accion: 'ACTUALIZAR_PARAMETRO',
        detalle: {
          clave: existing.clave,
          anterior: {
            valor: money(existing.valor),
            tipo: existing.tipo,
            descripcion: existing.descripcion,
            activo: existing.activo,
          },
          nuevo: {
            valor: money(updated.valor),
            tipo: updated.tipo,
            descripcion: updated.descripcion,
            activo: updated.activo,
          },
        },
      },
    })

    return updated
  })

  return { data: serializeParametro(parametro), status: 200 }
}

export async function getSocios() {
  const socios = await prisma.socio.findMany({
    orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
  })
  const validation = await validateSociosPercentages()

  return {
    rows: socios.map(serializeSocio),
    validation,
  }
}

export async function validateSociosPercentages() {
  const socios = await prisma.socio.findMany({
    where: { activo: true },
    select: { porcentajeParticipacion: true },
  })
  const total = socios.reduce((sum, socio) => sum.add(socio.porcentajeParticipacion), new Prisma.Decimal(0))

  return {
    totalDecimal: money(total),
    totalPercent: total.mul(100).toDecimalPlaces(4).toString(),
    isValid: total.equals(1),
    activeCount: socios.length,
    message: total.equals(1)
      ? 'Los socios activos suman 100%.'
      : `Los socios activos deben sumar 100%. Suma actual: ${total.mul(100).toDecimalPlaces(2).toFixed(2)}%.`,
  }
}

export async function createSocio(input: Record<string, unknown>, usuarioId?: string) {
  const parsed = parseSocioInput(input)
  if ('error' in parsed) {
    return parsed
  }

  const socio = await prisma.$transaction(async (tx) => {
    const created = await tx.socio.create({
      data: parsed.data,
    })

    await tx.auditoria.create({
      data: {
        entidad: 'Socio',
        entidadId: created.id,
        usuarioId,
        accion: 'CREAR_SOCIO',
        detalle: serializeSocio(created),
      },
    })

    return created
  })

  return { data: serializeSocio(socio), status: 201 }
}

export async function updateSocio(id: string, input: Record<string, unknown>, usuarioId?: string) {
  const existing = await prisma.socio.findUnique({
    where: { id },
  })

  if (!existing) {
    return { error: { error: 'NOT_FOUND', message: 'Socio no encontrado.' }, status: 404 }
  }

  const parsed = parseSocioInput(input)
  if ('error' in parsed) {
    return parsed
  }

  const socio = await prisma.$transaction(async (tx) => {
    const updated = await tx.socio.update({
      where: { id },
      data: parsed.data,
    })

    await tx.auditoria.create({
      data: {
        entidad: 'Socio',
        entidadId: id,
        usuarioId,
        accion: 'ACTUALIZAR_SOCIO',
        detalle: {
          anterior: serializeSocio(existing),
          nuevo: serializeSocio(updated),
        },
      },
    })

    return updated
  })

  return { data: serializeSocio(socio), status: 200 }
}

export async function deactivateSocio(id: string, usuarioId?: string) {
  const existing = await prisma.socio.findUnique({
    where: { id },
  })

  if (!existing) {
    return { error: { error: 'NOT_FOUND', message: 'Socio no encontrado.' }, status: 404 }
  }

  const socio = await prisma.$transaction(async (tx) => {
    const updated = await tx.socio.update({
      where: { id },
      data: { activo: false },
    })

    await tx.auditoria.create({
      data: {
        entidad: 'Socio',
        entidadId: id,
        usuarioId,
        accion: 'DESACTIVAR_SOCIO',
        detalle: {
          anterior: serializeSocio(existing),
          nuevo: serializeSocio(updated),
        },
      },
    })

    return updated
  })

  return { data: serializeSocio(socio), status: 200 }
}

function parseSocioInput(input: Record<string, unknown>) {
  const nombre = text(input.nombre)
  const porcentajeParticipacion = parseSocioPercentage(input.porcentajeParticipacion)
  const cuentaPesos = text(input.cuentaPesos)
  const cuentaUsd = text(input.cuentaUsd)

  if (!nombre) {
    return { error: { error: 'SOCIO_INVALIDO', message: 'El nombre del socio es requerido.' }, status: 422 }
  }

  if (!porcentajeParticipacion || porcentajeParticipacion.lessThan(0)) {
    return { error: { error: 'SOCIO_INVALIDO', message: 'El porcentaje de participación debe ser mayor o igual a 0.' }, status: 422 }
  }

  return {
    data: {
      nombre,
      porcentajeParticipacion,
      cuentas: cuentasJson(cuentaPesos, cuentaUsd),
      activo: bool(input.activo),
    },
  }
}
