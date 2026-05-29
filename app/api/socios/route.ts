import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { createSocio, getSocios } from '@/lib/parametros-socios'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  return NextResponse.json(await getSocios())
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  const result = await createSocio(await request.json().catch(() => ({})), auth.user.id)

  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
