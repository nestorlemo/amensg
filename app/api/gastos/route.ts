import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { createGasto, getGastos } from '@/lib/gastos-ingresos'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  return NextResponse.json(await getGastos(new URL(request.url).searchParams))
}

export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const result = await createGasto(await request.json().catch(() => ({})))
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
