import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const [rows, tipoCambioParam] = await Promise.all([
    prisma.cobro.findMany({
      where: { estado: 'FACTURADO' },
      select: {
        empresaId: true,
        empresa: { select: { nombre: true } },
        montoSinIva: true,
        iva: true,
        montoConIva: true,
        moneda: true,
      },
    }),
    prisma.parametro.findUnique({ where: { clave: 'tipo_cambio_usd' }, select: { valor: true } }),
  ])

  const tipoCambio = tipoCambioParam ? Number(tipoCambioParam.valor) : 1

  const map = new Map<string, { empresa: string; count: number; sinIva: number; iva: number; conIva: number }>()
  for (const r of rows) {
    const tc = r.moneda === 'USD' ? tipoCambio : 1
    const key = r.empresaId
    const existing = map.get(key)
    const sinIva = Number(r.montoSinIva) * tc
    const ivaAmt = Number(r.iva) * tc
    const conIva = Number(r.montoConIva) * tc
    if (existing) {
      existing.count += 1
      existing.sinIva += sinIva
      existing.iva += ivaAmt
      existing.conIva += conIva
    } else {
      map.set(key, { empresa: r.empresa?.nombre ?? '', count: 1, sinIva, iva: ivaAmt, conIva })
    }
  }

  const resumen = [...map.values()]
    .sort((a, b) => a.empresa.localeCompare(b.empresa))
    .map((r) => ({
      empresa: r.empresa,
      count: r.count,
      sinIva: r.sinIva.toFixed(2),
      iva: r.iva.toFixed(2),
      conIva: r.conIva.toFixed(2),
    }))

  return NextResponse.json({ resumen })
}
