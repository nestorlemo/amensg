import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { getImportacionDetail } from '@/lib/read-models'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const result = await getImportacionDetail(id)

  if (!result) {
    return NextResponse.json({ error: 'IMPORTACION_NO_ENCONTRADA' }, { status: 404 })
  }

  return NextResponse.json(result)
}
