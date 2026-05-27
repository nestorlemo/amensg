import { NextResponse } from 'next/server'

import { createGastoConcepto, getGastoConceptos } from '@/lib/gastos-ingresos'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(await getGastoConceptos())
}

export async function POST(request: Request) {
  const result = await createGastoConcepto(await request.json().catch(() => ({})))
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
