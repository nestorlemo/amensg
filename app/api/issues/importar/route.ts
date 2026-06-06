import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Se esperaba un array de issues.' }, { status: 422 })
  }

  const results: { ok: boolean; index: number; id?: string; error?: string }[] = []

  for (let i = 0; i < body.length; i++) {
    const item = body[i] as Record<string, unknown>
    try {
      const descripcion     = typeof item.descripcion === 'string' ? item.descripcion.trim() : ''
      const reportadoPor    = typeof item.reportadoPor === 'string' ? item.reportadoPor.trim() : 'Importado'
      const estado          = typeof item.estado === 'string' ? item.estado : 'PENDIENTE'
      const prioridad       = typeof item.prioridad === 'string' ? item.prioridad : 'MEDIA'
      const fecha           = item.fecha ? new Date(item.fecha as string) : new Date()
      const horasDesarrollo = Number(item.horasDesarrollo ?? 0)
      const horasTest       = Number(item.horasTest ?? 0)
      const horasRework     = Number(item.horasRework ?? 0)
      const totalHoras      = horasDesarrollo + horasTest + horasRework
      const empresaId       = typeof item.empresaId === 'string' && item.empresaId ? item.empresaId : null
      const fechaProduccion = item.fechaProduccion ? new Date(item.fechaProduccion as string) : null

      if (!descripcion) throw new Error('descripcion es requerida')

      const created = await prisma.issue.create({
        data: { fecha, descripcion, horasDesarrollo, horasTest, horasRework, totalHoras, estado, fechaProduccion, reportadoPor, prioridad, empresaId },
        include: { empresa: { select: { id: true, nombre: true } } },
      })
      results.push({ ok: true, index: i, id: created.id })
    } catch (err) {
      results.push({ ok: false, index: i, error: err instanceof Error ? err.message : 'Error desconocido' })
    }
  }

  const ok    = results.filter((r) => r.ok).length
  const errores = results.filter((r) => !r.ok)

  return NextResponse.json({ importados: ok, errores: errores.length, detalle: errores }, { status: 201 })
}
