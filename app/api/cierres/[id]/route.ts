import { NextResponse } from 'next/server'

import { notFoundError } from '@/lib/api-errors'
import { requireApiAuth } from '@/lib/auth'
import { getCierre } from '@/lib/liquidaciones'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const cierre = await getCierre(id)

  if (!cierre) {
    return notFoundError('No se encontró el cierre mensual.')
  }

  return NextResponse.json(cierre)
}
