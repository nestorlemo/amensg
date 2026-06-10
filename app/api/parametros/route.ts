import { NextRequest, NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getParametros } from '@/lib/parametros-socios'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  return NextResponse.json(await getParametros())
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const clave = typeof body.clave === 'string' ? body.clave.trim() : ''
  const valor = typeof body.valor === 'string' ? body.valor.trim() : ''
  const tipo  = typeof body.tipo  === 'string' ? body.tipo.trim()  : 'DECIMAL'
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : null
  const activo = body.activo !== false

  if (!clave) return NextResponse.json({ error: 'La clave es requerida.' }, { status: 422 })
  if (!valor) return NextResponse.json({ error: 'El valor es requerido.' }, { status: 422 })

  const existing = await prisma.parametro.findUnique({ where: { clave } })
  if (existing) return NextResponse.json({ error: 'Ya existe un parámetro con esa clave.' }, { status: 409 })

  const created = await prisma.parametro.create({
    data: { clave, valor, tipo, descripcion: descripcion ?? undefined, activo },
  })

  await prisma.auditoria.create({
    data: {
      usuarioId: auth.user.id,
      entidad: 'Parametro',
      entidadId: created.id,
      accion: 'CREAR',
      detalle: { clave, tipo },
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
