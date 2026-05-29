import { NextResponse } from 'next/server'

import { requireApiAdmin } from '@/lib/auth'
import { cerrarLiquidacion } from '@/lib/liquidaciones'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const auth = await requireApiAdmin()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const anio = Number(body?.anio)
  const mes = Number(body?.mes)

  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'PERIODO_INVALIDO' }, { status: 400 })
  }

  const result = await cerrarLiquidacion({ anio, mes }, body?.confirmacion === true, auth.user.id)

  if ('error' in result) {
    return NextResponse.json(result.error, { status: result.status })
  }

  return NextResponse.json(result.data, { status: result.status })
}
