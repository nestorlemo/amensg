import { NextResponse } from 'next/server'

import { getAuditoria } from '@/lib/auditoria'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  return NextResponse.json(await getAuditoria(new URL(request.url).searchParams))
}
