import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { deactivateGastoConcepto } from '@/lib/gastos-ingresos'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const result = await deactivateGastoConcepto(id)
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data)
}
