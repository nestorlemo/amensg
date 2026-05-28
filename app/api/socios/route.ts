import { NextResponse } from 'next/server'

import { createSocio, getSocios } from '@/lib/parametros-socios'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(await getSocios())
}

export async function POST(request: Request) {
  const result = await createSocio(await request.json().catch(() => ({})))

  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
