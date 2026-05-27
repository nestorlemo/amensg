import { NextResponse } from 'next/server'

import { getCierres } from '@/lib/liquidaciones'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(await getCierres())
}
