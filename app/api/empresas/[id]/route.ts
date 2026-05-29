import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const empresa = await prisma.empresa.findUnique({
    where: { id },
    select: { id: true, nombre: true, activa: true, creadaEn: true },
  })

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

  const data = body as Record<string, unknown>

  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) return apiError('NOT_FOUND', 'Empresa no encontrada.', 404)

  const updates: { nombre?: string; activa?: boolean } = {}

  if (typeof data.nombre === 'string') {
    const nombre = data.nombre.trim()
    if (!nombre) return apiError('VALIDATION_ERROR', 'El nombre no puede estar vacío.', 400)
    const existe = await prisma.empresa.findFirst({ where: { nombre, id: { not: id } } })
    if (existe) return apiError('VALIDATION_ERROR', 'Ya existe una empresa con ese nombre.', 409)
    updates.nombre = nombre
  }

  if (typeof data.activa === 'boolean') {
    updates.activa = data.activa
  }

  if (Object.keys(updates).length === 0) {
    return apiError('VALIDATION_ERROR', 'No hay campos para actualizar.', 400)
  }

  const updated = await prisma.empresa.update({
    where: { id },
    data: updates,
    select: { id: true, nombre: true, activa: true, creadaEn: true },
  })

  return NextResponse.json({ empresa: updated })
}
