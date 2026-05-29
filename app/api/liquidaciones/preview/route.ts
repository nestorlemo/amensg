import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { buildLiquidacionPreview, periodFromUrl } from '@/lib/liquidaciones'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const period = periodFromUrl(new URL(request.url).searchParams)

  if (!period) {
    return NextResponse.json({ error: 'PERIODO_INVALIDO' }, { status: 400 })
  }

  return NextResponse.json(await buildLiquidacionPreview(period))
}
