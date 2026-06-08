import { createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { canViewRouteForRole, isAdminRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const SESSION_COOKIE = 'amensg_session'
export const ROLES = ['ADMIN', 'OPERADOR', 'ISSUES'] as const
export type UserRole = (typeof ROLES)[number]

export type CurrentUser = {
  id: string
  nombre: string
  email: string
  rol: UserRole
}

export function isAdmin(user: CurrentUser | null | undefined) {
  return isAdminRole(user?.rol)
}

export function canViewRoute(user: CurrentUser | null, path: string) {
  return canViewRouteForRole(user?.rol, path)
}

export async function createSessionCookie(userId: string) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)?.value
  const userId = verifySession(session)

  if (!userId) {
    return null
  }

  const user = await prisma.usuario.findFirst({
    where: { id: userId, activo: true },
    select: { id: true, nombre: true, email: true, rol: true },
  })

  if (!user || !isUserRole(user.rol)) {
    return null
  }

  return user as CurrentUser
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireAdminPage() {
  const user = await requireAuth()
  if (!isAdmin(user)) {
    return null
  }
  return user
}

export async function requireApiAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return { error: apiError('UNAUTHORIZED', 'Debe iniciar sesión para continuar.', 401) }
  }
  return { user }
}

export async function requireApiAdmin() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth
  if (!isAdmin(auth.user)) {
    return { error: forbiddenResponse() }
  }
  return auth
}

export function forbiddenResponse(message = 'No tiene permisos para realizar esta accion.') {
  return apiError('FORBIDDEN', message, 403)
}

export function clearSessionResponse(redirectTo = '/login') {
  const response = NextResponse.redirect(new URL(redirectTo, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
  response.cookies.set('amensg_rol', '', { httpOnly: true, maxAge: 0, path: '/' })
  return response
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  }
}

function verifySession(value: string | undefined) {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [userId, expiresAtRaw, signature] = parts
  const payload = `${userId}.${expiresAtRaw}`
  const expected = sign(payload)
  const expiresAt = Number(expiresAtRaw)

  if (!safeEqual(signature, expected) || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null
  }

  return userId
}

function sign(value: string) {
  return createHmac('sha256', sessionSecret()).update(value).digest('hex')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function sessionSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'amensg-local-dev-secret'
}

function isUserRole(value: string): value is UserRole {
  return ROLES.includes(value as UserRole)
}
