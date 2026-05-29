import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { updateSocio } from '@/lib/parametros-socios'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const result = await updateSocio(id, await request.json().catch(() => ({})), auth.user.id)

  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
