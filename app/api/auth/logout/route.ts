import { NextResponse } from 'next/server'

import { SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') || 'http'
  const response = NextResponse.redirect(new URL('/login', `${proto}://${host}`))
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
  return response
}
