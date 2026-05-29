import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { buildLiquidacionPreview, periodFromUrl } from '@/lib/liquidaciones'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const period = periodFromUrl(new URL(request.url).searchParams)

  if (!period) {
    return apiError('VALIDATION_ERROR', 'Debe indicar un año y mes válidos.', 400, { error: 'PERIODO_INVALIDO' })
  }

  return NextResponse.json(await buildLiquidacionPreview(period))
}
