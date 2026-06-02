import { NextResponse } from 'next/server'

import { apiError, handlePrismaError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const SELECT = {
  id: true, nombre: true, razonSocial: true, rut: true,
  direccion: true, contacto: true, mail: true, telefono: true,
  activa: true, creadaEn: true,
} as const

export async function GET() {
  const auth = await requireApiAuth()
  if (auth.error) return auth.error

  const empresas = await prisma.empresa.findMany({
    orderBy: [{ activa: 'desc' }, { nombre: 'asc' }],
    select: SELECT,
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

  const d = body as Record<string, unknown>

  const nombre = typeof d.nombre === 'string' ? d.nombre.trim() : ''
  if (!nombre) return apiError('VALIDATION_ERROR', 'El nombre de la empresa es requerido.', 400)

  const existe = await prisma.empresa.findFirst({ where: { nombre } })
  if (existe) return apiError('VALIDATION_ERROR', 'Ya existe una empresa con ese nombre.', 409)

  try {
    const empresa = await prisma.empresa.create({
      data: {
        nombre,
        razonSocial: optStr(d.razonSocial),
        rut:         optStr(d.rut),
        direccion:   optStr(d.direccion),
        contacto:    optStr(d.contacto),
        mail:        optStr(d.mail),
        telefono:    optStr(d.telefono),
      },
      select: SELECT,
    })
    return NextResponse.json({ empresa }, { status: 201 })
  } catch (err) {
    return handlePrismaError(err, { nombre: 'nombre' })
  }
}

function optStr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length > 0 ? s : null
}
