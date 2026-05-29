import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { getParametros } from '@/lib/parametros-socios'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  return NextResponse.json(await getParametros())
}
