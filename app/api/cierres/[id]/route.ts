import { NextResponse } from 'next/server'

import { getCierre } from '@/lib/liquidaciones'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const cierre = await getCierre(id)

  if (!cierre) {
    return NextResponse.json({ error: 'CIERRE_NO_ENCONTRADO' }, { status: 404 })
  }

  return NextResponse.json(cierre)
}
