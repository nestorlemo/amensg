import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { createSessionCookie, sessionCookieOptions } from '@/lib/auth'
import { verifyPassword } from '@/lib/passwords'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return apiError('VALIDATION_ERROR', 'Email y contraseña son requeridos.', 422)
  }

  const user = await prisma.usuario.findUnique({ where: { email } })

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return apiError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos.', 401)
  }

  if (!user.activo) {
    return apiError('USER_INACTIVE', 'El usuario está inactivo.', 403)
  }

  await prisma.auditoria.create({
    data: {
      usuarioId: user.id,
      entidad: 'Usuario',
      entidadId: user.id,
      accion: 'LOGIN',
      detalle: { email: user.email },
    },
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('amensg_session', await createSessionCookie(user.id), sessionCookieOptions())
  response.cookies.set('amensg_rol', user.rol, sessionCookieOptions())
  return response
}
