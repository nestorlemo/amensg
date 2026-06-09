import { prisma } from '@/lib/prisma'
import { parseIssueBody, serializeIssue } from '@/lib/issues'

export type IssuesFilters = {
  estado?: string
  estadoIn?: string[]
  facturacion?: string
  empresaId?: string
  prioridad?: string
  fechaDesde?: string
  fechaHasta?: string
  sistema?: string
  page?: number
}

export async function getIssues(filters: IssuesFilters = {}) {
  const { estado, estadoIn = [], facturacion, empresaId, prioridad, fechaDesde, fechaHasta, sistema, page = 1 } = filters
  const pageSize = 50

  const where: Record<string, unknown> = { eliminado: false }
  if (estadoIn.length > 0) where.estado = { in: estadoIn }
  else if (estado) where.estado = estado
  if (empresaId) where.empresaId = empresaId
  if (prioridad) where.prioridad = prioridad
  if (sistema)   where.sistema   = sistema
  if (fechaDesde || fechaHasta) {
    const range: Record<string, Date> = {}
    if (fechaDesde) range.gte = new Date(fechaDesde)
    if (fechaHasta) {
      const hasta = new Date(fechaHasta)
      hasta.setDate(hasta.getDate() + 1)
      range.lt = hasta
    }
    where.fechaProduccion = range
  }
  if (facturacion === 'sin_facturar') where.facturaIssues = { none: {} }
  if (facturacion === 'facturado')    where.facturaIssues = { some: {} }

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: {
        empresa: { select: { id: true, nombre: true } },
        facturaIssues: { select: { facturaId: true } },
      },
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.issue.count({ where }),
  ])

  return {
    issues: issues.map((issue) => ({
      ...serializeIssue(issue),
      facturado: issue.facturaIssues.length > 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function createIssue(body: Record<string, unknown>, usuarioId: string) {
  const parsed = parseIssueBody(body)
  if ('error' in parsed) return { error: parsed.error }

  const issue = await prisma.issue.create({
    data: parsed.data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Issue',
      entidadId: issue.id,
      accion: 'CREAR_ISSUE',
      detalle: {
        descripcion: issue.descripcion,
        empresa: issue.empresa.nombre,
        estado: issue.estado,
      },
    },
  })

  return { data: serializeIssue(issue) }
}

export async function updateIssue(id: string, body: Record<string, unknown>, usuarioId: string) {
  const existing = await prisma.issue.findUnique({ where: { id, eliminado: false } })
  if (!existing) return { notFound: true }

  const parsed = parseIssueBody(body)
  if ('error' in parsed) return { error: parsed.error }

  const updated = await prisma.issue.update({
    where: { id },
    data: parsed.data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Issue',
      entidadId: id,
      accion: 'EDITAR_ISSUE',
      detalle: {
        descripcion: updated.descripcion,
        empresa: updated.empresa.nombre,
        estado: updated.estado,
      },
    },
  })

  return { data: serializeIssue(updated) }
}

const ESTADOS_VALIDOS = new Set(['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO'])

export type CambiarEstadoExtras = {
  fechaProduccion?: string
  motivoCancelacion?: string
}

export async function cambiarEstadoIssue(id: string, estado: string, extras: CambiarEstadoExtras, usuarioId: string) {
  const existing = await prisma.issue.findUnique({ where: { id, eliminado: false } })
  if (!existing) return { notFound: true }

  if (!ESTADOS_VALIDOS.has(estado)) return { validationError: 'Estado inválido.' }

  if (estado === 'CANCELADO') {
    const motivo = typeof extras.motivoCancelacion === 'string' ? extras.motivoCancelacion.trim() : ''
    if (!motivo) return { validationError: 'El motivo de cancelación es requerido.' }
  }

  if (estado === 'EN_PRODUCCION') {
    const fp = typeof extras.fechaProduccion === 'string' ? extras.fechaProduccion.trim() : ''
    if (!fp) return { validationError: 'La fecha en producción es requerida.' }
    if (isNaN(new Date(fp).getTime())) return { validationError: 'Fecha en producción inválida.' }
  }

  const data: Record<string, unknown> = {
    estado,
    fechaProduccion: estado === 'EN_PRODUCCION' ? new Date(extras.fechaProduccion!) : null,
    motivoCancelacion: estado === 'CANCELADO' ? extras.motivoCancelacion!.trim() : null,
  }

  const updated = await prisma.issue.update({
    where: { id },
    data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Issue',
      entidadId: id,
      accion: 'CAMBIAR_ESTADO_ISSUE',
      detalle: {
        estadoAnterior: existing.estado,
        estadoNuevo: estado,
        descripcion: updated.descripcion,
        empresa: updated.empresa.nombre,
      },
    },
  })

  return { data: serializeIssue(updated) }
}

export async function eliminarIssue(id: string, usuarioId: string) {
  const hasFactura = await prisma.facturaIssue.findFirst({ where: { issueId: id } })
  if (hasFactura) return { conflict: 'No se puede eliminar un issue facturado.' }

  const issue = await prisma.issue.findUnique({
    where: { id },
    select: { descripcion: true, empresa: { select: { nombre: true } } },
  })

  await prisma.issue.update({ where: { id }, data: { eliminado: true } })

  await prisma.auditoria.create({
    data: {
      usuarioId,
      entidad: 'Issue',
      entidadId: id,
      accion: 'ELIMINAR_ISSUE',
      detalle: {
        descripcion: issue?.descripcion,
        empresa: issue?.empresa?.nombre,
      },
    },
  })

  return { ok: true }
}
