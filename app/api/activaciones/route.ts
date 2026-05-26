import { NextResponse } from 'next/server'

import { getActivaciones } from '@/lib/read-models'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const result = await getActivaciones(params)

  return NextResponse.json(result)
}
