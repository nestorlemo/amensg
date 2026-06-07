import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'amensg_session'
const PUBLIC_PREFIXES = ['/login', '/api/auth/login', '/api/auth/logout', '/_next', '/favicon.ico']

// Routes the ISSUES role can access (page routes)
const ISSUES_ALLOWED_PAGES = ['/', '/issues']

// API routes the ISSUES role can access
const ISSUES_ALLOWED_APIS = [
  '/api/issues',
  '/api/auth/logout',
  '/api/dashboard/stats',
  '/api/empresas',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const redirectUrl = new URL('/login', `${proto}://${host}`)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const rol = request.cookies.get('amensg_rol')?.value

  if (rol === 'ISSUES') {
    if (pathname.startsWith('/api')) {
      // /api/empresas: GET only
      if (pathname === '/api/empresas' || pathname.startsWith('/api/empresas/')) {
        if (request.method !== 'GET') {
          return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
        }
        return NextResponse.next()
      }
      const allowed = ISSUES_ALLOWED_APIS.some((p) =>
        pathname === p || pathname.startsWith(p + '/')
      )
      if (!allowed) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    } else {
      const allowed = ISSUES_ALLOWED_PAGES.some((p) =>
        p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')
      )
      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/issues'
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
