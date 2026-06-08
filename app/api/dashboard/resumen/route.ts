import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function dec2(v: number) {
  return v.toFixed(2)
}

async function calcMes(anio: number, mes: number) {
  const [cobros, gastosVar, gastosFijosConceptos] = await Promise.all([
    prisma.cobro.findMany({
      where: { anio, mes, moneda: 'UYU' },
      select: { estado: true, montoConIva: true, montoSinIva: true },
    }),
    prisma.gastoMensual.findMany({
      where: { anio, mes },
      select: { importe: true },
    }),
    prisma.gastoConcepto.findMany({
      where: { tipo: 'FIJO', activo: true, monto: { not: null } },
      select: { monto: true },
    }),
  ])

  const cobrados = cobros.filter(c => c.estado === 'COBRADO')
  const facturados = cobros.filter(c => c.estado === 'FACTURADO')

  const ingresosCobrados = cobrados.reduce((s, c) => s + Number(c.montoConIva), 0)
  const ingresosPendientes = facturados.reduce((s, c) => s + Number(c.montoConIva), 0)
  const ingresosEsperados = ingresosCobrados + ingresosPendientes

  // resultado estimado uses sin IVA amounts
  const cobradosSinIva = cobrados.reduce((s, c) => s + Number(c.montoSinIva), 0)
  const pendientesSinIva = facturados.reduce((s, c) => s + Number(c.montoSinIva), 0)
  const ingresosEsperadosSinIva = cobradosSinIva + pendientesSinIva

  const gastosVariables = gastosVar.reduce((s, g) => s + Number(g.importe), 0)
  const gastosFijos = gastosFijosConceptos.reduce((s, g) => s + Number(g.monto ?? 0), 0)
  const gastosTotales = gastosVariables + gastosFijos

  return {
    ingresosCobrados: dec2(ingresosCobrados),
    ingresosPendientes: dec2(ingresosPendientes),
    ingresosEsperados: dec2(ingresosEsperados),
    gastosFijos: dec2(gastosTotales),
    resultadoEstimado: dec2(ingresosEsperadosSinIva - gastosTotales),
  }
}

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const now = new Date()
  const anio = now.getFullYear()
  const mes = now.getMonth() + 1

  const mesAnterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 }

  const [actual, anterior] = await Promise.all([
    calcMes(anio, mes),
    calcMes(mesAnterior.anio, mesAnterior.mes),
  ])

  return NextResponse.json({
    periodo: { anio, mes },
    ...actual,
    mesAnterior: {
      ingresosCobrados: anterior.ingresosCobrados,
      resultadoDistribuible: anterior.resultadoEstimado,
    },
  })
}
