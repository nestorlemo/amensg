import { NextResponse } from 'next/server'

import { deleteGasto, updateGasto } from '@/lib/gastos-ingresos'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params
  const result = await updateGasto(id, await request.json().catch(() => ({})))
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data)
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const result = await deleteGasto(id)
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data)
}
