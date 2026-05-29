import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { createUsuario, getUsuarios } from '@/lib/usuarios'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  return NextResponse.json(await getUsuarios())
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  const result = await createUsuario(await request.json().catch(() => ({})), auth.user)
  return 'error' in result ? NextResponse.json(result.error, { status: result.status }) : NextResponse.json(result.data, { status: result.status })
}
