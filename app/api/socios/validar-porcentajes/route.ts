import { NextResponse } from 'next/server'

import { validateSociosPercentages } from '@/lib/parametros-socios'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(await validateSociosPercentages())
}
