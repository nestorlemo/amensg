import { NextResponse } from 'next/server'

import { updateParametro } from '@/lib/parametros-socios'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  const result = await updateParametro(id, await request.json().catch(() => ({})))

  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
