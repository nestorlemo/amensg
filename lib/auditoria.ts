import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { SearchParamsInput } from '@/lib/read-models'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

function param(params: SearchParamsInput, key: string) {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined
  }

  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function textParam(params: SearchParamsInput, key: string) {
  const value = param(params, key)?.trim()
  return value ? value : undefined
}

function limitParam(params: SearchParamsInput) {
  const value = Number(textParam(params, 'limit'))
  return Number.isInteger(value) ? Math.min(Math.max(value, 1), MAX_LIMIT) : DEFAULT_LIMIT
}

function dateStart(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

function dateEnd(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
}

export async function getAuditoria(params: SearchParamsInput) {
  const fechaDesde = dateStart(textParam(params, 'fechaDesde'))
  const fechaHasta = dateEnd(textParam(params, 'fechaHasta'))
  const entidad = textParam(params, 'entidad')
  const accion = textParam(params, 'accion')
  const usuario = textParam(params, 'usuario')
  const q = textParam(params, 'q')?.toLowerCase()
  const limit = limitParam(params)
  const where: Prisma.AuditoriaWhereInput = {
    ...(fechaDesde || fechaHasta
      ? {
          creadoEn: {
            ...(fechaDesde ? { gte: fechaDesde } : {}),
            ...(fechaHasta ? { lte: fechaHasta } : {}),
          },
        }
      : {}),
    ...(entidad ? { entidad: { contains: entidad, mode: 'insensitive' } } : {}),
    ...(accion ? { accion: { contains: accion, mode: 'insensitive' } } : {}),
    ...(usuario
      ? {
          usuario: {
            OR: [
              { nombre: { contains: usuario, mode: 'insensitive' } },
              { email: { contains: usuario, mode: 'insensitive' } },
            ],
          },
        }
      : {}),
  }

  const rows = await prisma.auditoria.findMany({
    where,
    take: q ? Math.min(limit * 3, MAX_LIMIT) : limit,
    orderBy: { creadoEn: 'desc' },
    include: {
      usuario: {
        select: {
          nombre: true,
          email: true,
        },
      },
    },
  })

  const serialized = rows.map(serializeAuditRow)
  const filtered = q
    ? serialized.filter((row) =>
        [row.accion, row.entidad, row.entidadId, row.usuario, row.resumen, ...row.detalle.map((item) => `${item.label} ${item.value}`)]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    : serialized

  return {
    rows: filtered.slice(0, limit),
    filters: {
      limit,
      entidades: unique(serialized.map((row) => row.entidad)),
      acciones: unique(serialized.map((row) => row.accion)),
    },
  }
}

function serializeAuditRow(row: Prisma.AuditoriaGetPayload<{ include: { usuario: { select: { nombre: true; email: true } } } }>) {
  const detalle = readableDetails(row.detalle)

  return {
    id: row.id,
    fechaHora: row.creadoEn.toISOString(),
    createdAt: row.creadoEn.toISOString(),
    usuario: row.usuario?.nombre ?? row.usuario?.email ?? 'Sistema',
    accion: row.accion,
    entidad: row.entidad,
    entidadId: row.entidadId,
    resumen: summarize(row.accion, detalle),
    detalle,
  }
}

function summarize(accion: string, detalle: Array<{ label: string; value: string }>) {
  const motivo = detalle.find((item) => item.label.toLowerCase().includes('motivo'))?.value
  const clave = detalle.find((item) => item.label === 'clave')?.value
  const periodo = buildPeriod(detalle)
  const estadoNuevo = detalle.find((item) => item.label.toLowerCase().includes('estadonuevo'))?.value
  const nombre = detalle.find((item) => item.label === 'nombre' || item.label.endsWith('.nombre'))?.value

  if (motivo) return `${humanizeAction(accion)}. Motivo: ${motivo}`
  if (clave) return `${humanizeAction(accion)}: ${clave}`
  if (periodo) return `${humanizeAction(accion)} para ${periodo}`
  if (estadoNuevo) return `${humanizeAction(accion)} a ${estadoNuevo}`
  if (nombre) return `${humanizeAction(accion)}: ${nombre}`
  return humanizeAction(accion)
}

function buildPeriod(detalle: Array<{ label: string; value: string }>) {
  const anio = detalle.find((item) => item.label === 'anio')?.value
  const mes = detalle.find((item) => item.label === 'mes')?.value

  if (!anio || !mes) return null
  return `${String(mes).padStart(2, '0')}/${anio}`
}

function readableDetails(value: Prisma.JsonValue) {
  const rows: Array<{ label: string; value: string }> = []
  flattenJson(value, '', rows)
  return rows.length > 0 ? rows : [{ label: 'detalle', value: 'Sin detalle registrado' }]
}

function flattenJson(value: Prisma.JsonValue, prefix: string, rows: Array<{ label: string; value: string }>) {
  if (value === null || value === undefined) {
    if (prefix) rows.push({ label: prefix, value: 'Sin valor' })
    return
  }

  if (Array.isArray(value)) {
    rows.push({ label: prefix || 'items', value: `${value.length} item(s)` })
    value.slice(0, 10).forEach((item, index) => flattenJson(item, `${prefix || 'items'}[${index + 1}]`, rows))
    return
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0 && prefix) {
      rows.push({ label: prefix, value: 'Sin datos' })
    }

    for (const [key, child] of entries) {
      flattenJson(child as Prisma.JsonValue, prefix ? `${prefix}.${key}` : key, rows)
    }
    return
  }

  rows.push({ label: prefix || 'valor', value: String(value) })
}

function humanizeAction(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}
