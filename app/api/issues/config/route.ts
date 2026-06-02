import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/** Returns issue-related parameters for non-admin authenticated users. */
export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const claves = ['porcentaje_test_horas', 'porcentaje_rework_horas', 'valor_hora_desarrollo_usd']
  const params = await prisma.parametro.findMany({ where: { clave: { in: claves } } })

  const map = Object.fromEntries(params.map((p) => [p.clave, Number(p.valor)]))

  return NextResponse.json({
    porcentajeTest:    map['porcentaje_test_horas']        ?? 30,
    porcentajeRework:  map['porcentaje_rework_horas']       ?? 15,
    valorHoraUSD:      map['valor_hora_desarrollo_usd']     ?? 0,
  })
}
