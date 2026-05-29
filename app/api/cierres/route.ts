import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { getCierres } from '@/lib/liquidaciones'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  return NextResponse.json(await getCierres())
}
