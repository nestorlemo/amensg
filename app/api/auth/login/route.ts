import { NextResponse } from 'next/server'

import { createSessionCookie, sessionCookieOptions } from '@/lib/auth'
import { verifyPassword } from '@/lib/passwords'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'LOGIN_INVALIDO', message: 'Email y password son requeridos.' }, { status: 422 })
  }

  const user = await prisma.usuario.findUnique({ where: { email } })

  if (!user || !user.activo || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'CREDENCIALES_INVALIDAS', message: 'Credenciales invalidas.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('amensg_session', await createSessionCookie(user.id), sessionCookieOptions())
  return response
}
