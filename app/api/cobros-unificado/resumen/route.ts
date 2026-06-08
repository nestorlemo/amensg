import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type EmpresaRow = { empresa: string; facturas: number; sinIva: string; iva: string; conIva: string }

function groupByEmpresa(rows: { empresa: string | null; montoSinIva: { toString(): string }; iva: { toString(): string }; montoConIva: { toString(): string } }[]): EmpresaRow[] {
  const map = new Map<string, { facturas: number; sinIva: number; iva: number; conIva: number }>()
  for (const r of rows) {
    const key = r.empresa ?? '—'
    const e = map.get(key)
    if (e) {
      e.facturas += 1
      e.sinIva += Number(r.montoSinIva)
      e.iva += Number(r.iva)
      e.conIva += Number(r.montoConIva)
    } else {
      map.set(key, { facturas: 1, sinIva: Number(r.montoSinIva), iva: Number(r.iva), conIva: Number(r.montoConIva) })
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([empresa, v]) => ({
      empresa,
      facturas: v.facturas,
      sinIva: v.sinIva.toFixed(2),
      iva: v.iva.toFixed(2),
      conIva: v.conIva.toFixed(2),
    }))
}

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const now = new Date()

  const [rowsUYU, rowsUSD, cobradoMes, pendienteCount, empresasDeuda] = await Promise.all([
    prisma.cobro.findMany({
      where: { estado: 'FACTURADO', moneda: 'UYU' },
      select: {
        empresa: { select: { nombre: true } },
        montoSinIva: true,
        iva: true,
        montoConIva: true,
      },
    }),
    prisma.cobro.findMany({
      where: { estado: 'FACTURADO', moneda: 'USD' },
      select: {
        empresa: { select: { nombre: true } },
        montoSinIva: true,
        iva: true,
        montoConIva: true,
      },
    }),
    prisma.cobro.aggregate({
      where: { estado: 'COBRADO', moneda: 'UYU', anio: now.getFullYear(), mes: now.getMonth() + 1 },
      _sum: { montoConIva: true },
    }),
    prisma.cobro.count({ where: { estado: 'FACTURADO' } }),
    prisma.cobro.groupBy({ by: ['empresaId'], where: { estado: 'FACTURADO' } }),
  ])

  const flatUYU = rowsUYU.map((r) => ({ empresa: r.empresa?.nombre ?? null, montoSinIva: r.montoSinIva, iva: r.iva, montoConIva: r.montoConIva }))
  const flatUSD = rowsUSD.map((r) => ({ empresa: r.empresa?.nombre ?? null, montoSinIva: r.montoSinIva, iva: r.iva, montoConIva: r.montoConIva }))

  const totalUYU = rowsUYU.reduce((s, r) => s + Number(r.montoConIva), 0)
  const totalUSD = rowsUSD.reduce((s, r) => s + Number(r.montoConIva), 0)

  return NextResponse.json({
    pendienteUYU: {
      total: totalUYU.toFixed(2),
      porEmpresa: groupByEmpresa(flatUYU),
    },
    pendienteUSD: {
      total: totalUSD.toFixed(2),
      porEmpresa: groupByEmpresa(flatUSD),
    },
    cobradoEsteMesUYU: cobradoMes._sum.montoConIva?.toString() ?? '0',
    facturasPendientes: pendienteCount,
    empresasConDeuda: empresasDeuda.length,
  })
}
