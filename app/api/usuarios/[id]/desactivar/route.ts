import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { deactivateUsuario } from '@/lib/usuarios'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const result = await deactivateUsuario(id, auth.user)
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
