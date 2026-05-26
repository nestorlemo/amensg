import { NextResponse } from 'next/server'

import { getFacturacionActivaciones } from '@/lib/read-models'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const params = new URL(request.url).searchParams
  const result = await getFacturacionActivaciones(id, params)

  if (!result) {
    return NextResponse.json({ error: 'FACTURACION_NO_ENCONTRADA' }, { status: 404 })
  }

  return NextResponse.json(result)
}
