import { NextResponse } from 'next/server'

import { SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
  return response
}
