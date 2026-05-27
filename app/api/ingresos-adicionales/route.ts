import { NextResponse } from 'next/server'

import { createIngresoAdicional, getIngresosAdicionales } from '@/lib/gastos-ingresos'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  return NextResponse.json(await getIngresosAdicionales(new URL(request.url).searchParams))
}

export async function POST(request: Request) {
  const result = await createIngresoAdicional(await request.json().catch(() => ({})))
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
