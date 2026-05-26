import { NextResponse } from 'next/server'

import { getFacturacion } from '@/lib/read-models'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const result = await getFacturacion(params)

  return NextResponse.json(result)
}
