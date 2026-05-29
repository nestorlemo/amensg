import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const auth = await requireApiAuth()
  if (auth.error) return auth.error

  const empresas = await prisma.empresa.findMany({
    orderBy: [{ activa: 'desc' }, { nombre: 'asc' }],
    select: { id: true, nombre: true, activa: true, creadaEn: true },
  })

  return NextResponse.json({ empresas })
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('VALIDATION_ERROR', 'Cuerpo de la solicitud inválido.', 400)
  }

  const nombre = typeof (body as Record<string, unknown>).nombre === 'string'
    ? ((body as Record<string, unknown>).nombre as string).trim()
    : ''

  if (!nombre) {
    return apiError('VALIDATION_ERROR', 'El nombre de la empresa es requerido.', 400)
  }

  const existe = await prisma.empresa.findFirst({ where: { nombre } })
  if (existe) {
    return apiError('VALIDATION_ERROR', 'Ya existe una empresa con ese nombre.', 409)
  }

  const empresa = await prisma.empresa.create({
    data: { nombre },
    select: { id: true, nombre: true, activa: true, creadaEn: true },
  })

  return NextResponse.json({ empresa }, { status: 201 })
}
