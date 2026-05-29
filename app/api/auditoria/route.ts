import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { getAuditoria } from '@/lib/auditoria'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  return NextResponse.json(await getAuditoria(new URL(request.url).searchParams))
}
