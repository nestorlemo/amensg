import { NextResponse } from 'next/server'

import { getTipoCambioUsd } from '@/lib/tipo-cambio'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const fecha = new URL(request.url).searchParams.get('fecha')

  if (!fecha) {
    return NextResponse.json(
      { error: 'FECHA_REQUERIDA', message: 'El parametro fecha es requerido con formato YYYY-MM-DD.' },
      { status: 422 },
    )
  }

  const result = await getTipoCambioUsd(fecha)
  return 'error' in result
    ? NextResponse.json(result.error, { status: result.status })
    : NextResponse.json(result.data, { status: result.status })
}
