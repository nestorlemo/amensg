import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type DesarrolloFactura = { totalUSD: string; totalHoras: string }

function extraerKpis(snapshot: Record<string, unknown>) {
  const ingresos = snapshot.ingresos as Record<string, unknown> | undefined
  const desarrolloFacturas = (ingresos?.desarrolloFacturas ?? []) as DesarrolloFactura[]
  return {
    totalFacturadoUYU:     Number(snapshot.totalIngresosSinIva ?? 0),
    resultadoDistribuible: Number(snapshot.resultadoDistribuible ?? 0),
    desarrolloUSD:         desarrolloFacturas.reduce((s, f) => s + Number(f.totalUSD), 0),
    totalActivaciones:     Number(snapshot.totalActivaciones ?? 0),
    horasDesarrollo:       desarrolloFacturas.reduce((s, f) => s + Number(f.totalHoras), 0),
  }
}

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const ultimoCierre = await prisma.cierreMensual.findFirst({
    where: { estado: 'CERRADO' },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
  })

  if (!ultimoCierre) return NextResponse.json({ periodo: null })

  const cierreAnterior = await prisma.cierreMensual.findFirst({
    where: {
      estado: 'CERRADO',
      OR: [
        { anio: ultimoCierre.anio, mes: { lt: ultimoCierre.mes } },
        { anio: { lt: ultimoCierre.anio } },
      ],
    },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
  })

  const { anio, mes } = ultimoCierre
  const snap = ultimoCierre.snapshot as Record<string, unknown>
  const actual = extraerKpis(snap)

  const anterior = cierreAnterior
    ? extraerKpis(cierreAnterior.snapshot as Record<string, unknown>)
    : null

  const periodoAnterior = cierreAnterior
    ? { anio: cierreAnterior.anio, mes: cierreAnterior.mes, nombre: `${MESES[cierreAnterior.mes - 1]} ${cierreAnterior.anio}` }
    : null

  return NextResponse.json({
    periodo: { anio, mes, nombre: `${MESES[mes - 1]} ${anio}` },
    periodoAnterior,
    actual,
    anterior,
  })
}
