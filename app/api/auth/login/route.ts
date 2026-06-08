import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { createSessionCookie, sessionCookieOptions } from '@/lib/auth'
import { verifyPassword } from '@/lib/passwords'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function pruneExpired() {
  const now = Date.now()
  for (const [ip, entry] of loginAttempts) {
    if (entry.resetAt <= now) loginAttempts.delete(ip)
  }
}

function isRateLimited(ip: string): { limited: boolean; minutesLeft: number } {
  pruneExpired()
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt <= Date.now()) return { limited: false, minutesLeft: 0 }
  if (entry.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((entry.resetAt - Date.now()) / 60000)
    return { limited: true, minutesLeft }
  }
  return { limited: false, minutesLeft: 0 }
}

function recordFailure(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request)

  const { limited, minutesLeft } = isRateLimited(ip)
  if (limited) {
    return apiError('RATE_LIMITED', `Demasiados intentos. Intentá de nuevo en ${minutesLeft} minuto${minutesLeft === 1 ? '' : 's'}.`, 429)
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return apiError('VALIDATION_ERROR', 'Email y contraseña son requeridos.', 422)
  }

  const user = await prisma.usuario.findUnique({ where: { email } })

  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordFailure(ip)
    return apiError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos.', 401)
  }

  if (!user.activo) {
    recordFailure(ip)
    return apiError('USER_INACTIVE', 'El usuario está inactivo.', 403)
  }

  loginAttempts.delete(ip)

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
