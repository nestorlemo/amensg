import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const ESTADOS_VALIDOS = new Set(['PENDIENTE', 'EN_DESARROLLO', 'EN_TEST', 'EN_PRODUCCION', 'CANCELADO', 'NO_HACER'])
const PRIORIDADES_VALIDAS = new Set(['ALTA', 'MEDIA', 'BAJA'])

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const estado      = searchParams.get('estado')      ?? undefined
  const empresaId   = searchParams.get('empresaId')   ?? undefined
  const prioridad   = searchParams.get('prioridad')   ?? undefined
  const fechaDesde  = searchParams.get('fechaDesde')  ?? undefined
  const fechaHasta  = searchParams.get('fechaHasta')  ?? undefined

  const where: Record<string, unknown> = {}
  if (estado)    where.estado    = estado
  if (empresaId) where.empresaId = empresaId
  if (prioridad) where.prioridad = prioridad
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

  const issues = await prisma.issue.findMany({
    where,
    include: { empresa: { select: { id: true, nombre: true } } },
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
  })

  return NextResponse.json({ issues: issues.map(serializeIssue) })
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  const parsed = parseIssueBody(body)
  if ('error' in parsed) return NextResponse.json(parsed.error, { status: 422 })

  const issue = await prisma.issue.create({
    data: parsed.data,
    include: { empresa: { select: { id: true, nombre: true } } },
  })

  return NextResponse.json(serializeIssue(issue), { status: 201 })
}

export function parseIssueBody(body: Record<string, unknown>) {
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''
  if (!descripcion) return { error: { error: 'VALIDATION_ERROR', message: 'La descripción es requerida.' } }

  const reportadoPor = typeof body.reportadoPor === 'string' ? body.reportadoPor.trim() : ''
  if (!reportadoPor) return { error: { error: 'VALIDATION_ERROR', message: 'El campo reportado por es requerido.' } }

  const estado    = typeof body.estado    === 'string' ? body.estado    : 'PENDIENTE'
  const prioridad = typeof body.prioridad === 'string' ? body.prioridad : 'MEDIA'
  if (!ESTADOS_VALIDOS.has(estado))    return { error: { error: 'VALIDATION_ERROR', message: 'Estado inválido.' } }
  if (!PRIORIDADES_VALIDAS.has(prioridad)) return { error: { error: 'VALIDATION_ERROR', message: 'Prioridad inválida.' } }

  const fecha = body.fecha ? new Date(body.fecha as string) : new Date()
  if (isNaN(fecha.getTime())) return { error: { error: 'VALIDATION_ERROR', message: 'Fecha inválida.' } }

  const horasDesarrollo = parseDecimal(body.horasDesarrollo)
  const horasTest       = parseDecimal(body.horasTest) ?? 0
  const horasRework     = parseDecimal(body.horasRework) ?? 0

  if (horasDesarrollo === null || horasDesarrollo === undefined) {
    return { error: { error: 'VALIDATION_ERROR', message: 'Las horas de desarrollo son requeridas.' } }
  }

  const totalHoras = horasDesarrollo + horasTest + horasRework
  const empresaId  = typeof body.empresaId === 'string' && body.empresaId ? body.empresaId : null

  const fechaProduccion = estado === 'EN_PRODUCCION' && body.fechaProduccion
    ? new Date(body.fechaProduccion as string)
    : estado === 'EN_PRODUCCION' ? new Date() : null

  return {
    data: {
      fecha,
      descripcion,
      horasDesarrollo,
      horasTest,
      horasRework,
      totalHoras,
      estado,
      reportadoPor,
      prioridad,
      empresaId,
      fechaProduccion,
    },
  }
}

export function serializeIssue(issue: {
  id: string
  fecha: Date
  descripcion: string
  horasDesarrollo: { toString(): string }
  horasTest: { toString(): string }
  horasRework: { toString(): string }
  totalHoras: { toString(): string }
  estado: string
  fechaProduccion: Date | null
  reportadoPor: string
  prioridad: string
  creadoEn: Date
  empresa?: { id: string; nombre: string } | null
}) {
  return {
    id: issue.id,
    fecha: issue.fecha.toISOString().split('T')[0],
    descripcion: issue.descripcion,
    horasDesarrollo: Number(issue.horasDesarrollo),
    horasTest: Number(issue.horasTest),
    horasRework: Number(issue.horasRework),
    totalHoras: Number(issue.totalHoras),
    estado: issue.estado,
    fechaProduccion: issue.fechaProduccion ? issue.fechaProduccion.toISOString().split('T')[0] : null,
    reportadoPor: issue.reportadoPor,
    prioridad: issue.prioridad,
    creadoEn: issue.creadoEn.toISOString(),
    empresa: issue.empresa ?? null,
  }
}

function parseDecimal(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : Math.round(n * 100) / 100
}
