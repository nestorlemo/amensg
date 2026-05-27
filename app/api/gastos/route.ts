import { NextResponse } from 'next/server'

import { createGasto, getGastos } from '@/lib/gastos-ingresos'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  return NextResponse.json(await getGastos(new URL(request.url).searchParams))
}

export async function POST(request: Request) {
  const result = await createGasto(await request.json().catch(() => ({})))
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
