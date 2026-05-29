import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

const SELECT = {
  id: true, nombre: true, razonSocial: true, rut: true,
  direccion: true, contacto: true, mail: true, telefono: true,
  activa: true, creadaEn: true,
} as const

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id }, select: SELECT })
  if (!empresa) return apiError('NOT_FOUND', 'Empresa no encontrada.', 404)

  return NextResponse.json({ empresa })
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if (auth.error) return auth.error

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Cuerpo de la solicitud inválido.', 400)
  }

  const d = body as Record<string, unknown>

  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) return apiError('NOT_FOUND', 'Empresa no encontrada.', 404)

  const updates: Record<string, unknown> = {}

  if (typeof d.nombre === 'string') {
    const nombre = d.nombre.trim()
    if (!nombre) return apiError('VALIDATION_ERROR', 'El nombre no puede estar vacío.', 400)
    const existe = await prisma.empresa.findFirst({ where: { nombre, id: { not: id } } })
    if (existe) return apiError('VALIDATION_ERROR', 'Ya existe una empresa con ese nombre.', 409)
    updates.nombre = nombre
  }

  if (typeof d.activa === 'boolean') updates.activa = d.activa

  // optional string fields — empty string clears the value (sets null)
  for (const field of ['razonSocial', 'rut', 'direccion', 'contacto', 'mail', 'telefono'] as const) {
    if (field in d) {
      updates[field] = typeof d[field] === 'string' && (d[field] as string).trim()
        ? (d[field] as string).trim()
        : null
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError('VALIDATION_ERROR', 'No hay campos para actualizar.', 400)
  }

  const updated = await prisma.empresa.update({ where: { id }, data: updates, select: SELECT })

  return NextResponse.json({ empresa: updated })
}
