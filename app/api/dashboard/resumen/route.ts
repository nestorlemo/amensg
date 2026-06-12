import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type DesarrolloFactura = { totalUSD: string; totalHoras: string }

function snap(cierre: { snapshot: Prisma.JsonValue }) {
  return cierre.snapshot as Record<string, unknown>
}

function desarrolloFacturas(s: Record<string, unknown>): DesarrolloFactura[] {
  const ingresos = s.ingresos as Record<string, unknown> | undefined
  return (ingresos?.desarrolloFacturas ?? []) as DesarrolloFactura[]
}

function tieneDesarrollo(s: Record<string, unknown>): boolean {
  return desarrolloFacturas(s).some((f) => Number(f.totalUSD) > 0)
}

function extraerKpis(s: Record<string, unknown>) {
  const devFacturas = desarrolloFacturas(s)
  return {
    totalFacturadoUYU:     Number(s.totalIngresosSinIva ?? 0),
    resultadoDistribuible: Number(s.resultadoDistribuible ?? 0),
    totalActivaciones:     Number(s.totalActivaciones ?? 0),
    desarrolloUSD:         devFacturas.reduce((acc, f) => acc + Number(f.totalUSD), 0),
    horasDesarrollo:       devFacturas.reduce((acc, f) => acc + Number(f.totalHoras), 0),
  }
}

function nombrePeriodo(anio: number, mes: number) {
  return `${MESES[mes - 1] ?? ''} ${anio}`
}

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  // All closed cierres, newest first — needed to search for desarrollo
  const todosLosCierres = await prisma.cierreMensual.findMany({
    where: { estado: 'CERRADO' },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    select: { anio: true, mes: true, snapshot: true },
  })

  if (todosLosCierres.length === 0) return NextResponse.json({ periodo: null })

  const ultimoCierre = todosLosCierres[0]!
  const cierreAnterior = todosLosCierres[1] ?? null

  const { anio, mes } = ultimoCierre
  const s = snap(ultimoCierre)
  const actual = extraerKpis(s)

  const anterior = cierreAnterior ? extraerKpis(snap(cierreAnterior)) : null
  const periodoAnterior = cierreAnterior
    ? { anio: cierreAnterior.anio, mes: cierreAnterior.mes, nombre: nombrePeriodo(cierreAnterior.anio, cierreAnterior.mes) }
    : null

  // Desarrollo: find last cierre with desarrollo > 0
  const cierreConDesarrollo = todosLosCierres.find((c) => tieneDesarrollo(snap(c))) ?? null
  let desarrollo: {
    periodo: { anio: number; mes: number; nombre: string } | null
    periodoAnterior: { anio: number; mes: number; nombre: string } | null
    usdActual: number | null
    usdAnterior: number | null
    horasActual: number | null
    horasAnterior: number | null
  }

  if (!cierreConDesarrollo) {
    desarrollo = { periodo: null, periodoAnterior: null, usdActual: null, usdAnterior: null, horasActual: null, horasAnterior: null }
  } else {
    const idxActual = todosLosCierres.indexOf(cierreConDesarrollo)
    const cierresAnteriores = todosLosCierres.slice(idxActual + 1)
    const cierreAntDev = cierresAnteriores.find((c) => tieneDesarrollo(snap(c))) ?? null

    const devFacturasActual = desarrolloFacturas(snap(cierreConDesarrollo))
    const usdActual   = devFacturasActual.reduce((acc, f) => acc + Number(f.totalUSD), 0)
    const horasActual = devFacturasActual.reduce((acc, f) => acc + Number(f.totalHoras), 0)

    let usdAnterior: number | null = null
    let horasAnterior: number | null = null
    let periodoAntDev: { anio: number; mes: number; nombre: string } | null = null

    if (cierreAntDev) {
      const devFacturasAnt = desarrolloFacturas(snap(cierreAntDev))
      usdAnterior   = devFacturasAnt.reduce((acc, f) => acc + Number(f.totalUSD), 0)
      horasAnterior = devFacturasAnt.reduce((acc, f) => acc + Number(f.totalHoras), 0)
      periodoAntDev = { anio: cierreAntDev.anio, mes: cierreAntDev.mes, nombre: nombrePeriodo(cierreAntDev.anio, cierreAntDev.mes) }
    }

    desarrollo = {
      periodo: { anio: cierreConDesarrollo.anio, mes: cierreConDesarrollo.mes, nombre: nombrePeriodo(cierreConDesarrollo.anio, cierreConDesarrollo.mes) },
      periodoAnterior: periodoAntDev,
      usdActual,
      usdAnterior,
      horasActual,
      horasAnterior,
    }
  }

  return NextResponse.json({
    periodo: { anio, mes, nombre: nombrePeriodo(anio, mes) },
    periodoAnterior,
    actual,
    anterior,
    desarrollo,
  })
}
