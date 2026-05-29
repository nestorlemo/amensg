import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { getActivaciones } from '@/lib/read-models'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const params = new URL(request.url).searchParams
  const result = await getActivaciones(params)

  return NextResponse.json(result)
}
