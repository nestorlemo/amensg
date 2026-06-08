import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

async function calcAnio(anio: number, empresaId?: string) {
  const facturacionRows = await prisma.facturacionMensual.findMany({
    where: {
      anio,
      estadoCobro: { nombre: { not: 'ANULADO' } },
      ...(empresaId ? { empresaId } : {}),
    },
    select: { mes: true, empresa: { select: { nombre: true } }, cantidadActivaciones: true, totalSinIva: true },
  })

  const actMap = new Map<string, { cantidad: number; totalSinIva: number }>()
  for (const row of facturacionRows) {
    const key = `${row.mes}__${row.empresa.nombre}`
    const existing = actMap.get(key) ?? { cantidad: 0, totalSinIva: 0 }
    existing.cantidad += row.cantidadActivaciones
    existing.totalSinIva += Number(row.totalSinIva)
    actMap.set(key, existing)
  }

  const activacionesPorMesEmpresa: Array<{ mes: number; empresa: string; cantidad: number }> = []
  const facturacionPorMesEmpresa: Array<{ mes: number; empresa: string; totalSinIva: number }> = []
  for (const [key, val] of actMap.entries()) {
    const [mesStr, empresa] = key.split('__')
    const mes = parseInt(mesStr, 10)
    activacionesPorMesEmpresa.push({ mes, empresa, cantidad: val.cantidad })
    facturacionPorMesEmpresa.push({ mes, empresa, totalSinIva: val.totalSinIva })
  }

  const [gastosRows, gastosConceptoFijo, ingresosAdicRows, facturacionTotalRows, facturasDesarrollo] = await Promise.all([
    prisma.gastoMensual.findMany({ where: { anio }, select: { mes: true, importe: true } }),
    prisma.gastoConcepto.findMany({ where: { tipo: 'FIJO', activo: true }, select: { monto: true } }),
    prisma.ingresoAdicional.findMany({ where: { anio, ...(empresaId ? { empresaId } : {}) }, select: { mes: true, montoSinIva: true } }),
    prisma.facturacionMensual.findMany({
      where: { anio, estadoCobro: { nombre: { not: 'ANULADO' } }, ...(empresaId ? { empresaId } : {}) },
      select: { mes: true, totalSinIva: true },
    }),
    prisma.facturaDesarrollo.findMany({
      where: { anio, ...(empresaId ? { empresaId } : {}) },
      select: { mes: true, totalHoras: true, totalUSD: true, totalUYU: true },
    }),
  ])

  const gastoFijoTotal = gastosConceptoFijo.reduce((sum, g) => sum + Number(g.monto ?? 0), 0)

  const mesSet = new Set<number>()
  for (const r of facturacionTotalRows) mesSet.add(r.mes)
  for (const r of gastosRows) mesSet.add(r.mes)
  for (const r of ingresosAdicRows) mesSet.add(r.mes)

  const resultadoMensual: Array<{ mes: number; ingresos: number; gastos: number; resultado: number }> = []
  for (const mes of Array.from(mesSet).sort((a, b) => a - b)) {
    const ingresosFact = facturacionTotalRows.filter(r => r.mes === mes).reduce((s, r) => s + Number(r.totalSinIva), 0)
    const ingresosAdic = ingresosAdicRows.filter(r => r.mes === mes).reduce((s, r) => s + Number(r.montoSinIva), 0)
    const ingresos = ingresosFact + ingresosAdic
    const gastosVar = gastosRows.filter(r => r.mes === mes).reduce((s, r) => s + Number(r.importe), 0)
    const gastos = gastosVar + gastoFijoTotal
    resultadoMensual.push({ mes, ingresos, gastos, resultado: ingresos - gastos })
  }

  const horasMap = new Map<number, number>()
  const usdMap = new Map<number, number>()
  const uyuMap = new Map<number, number>()
  for (const f of facturasDesarrollo) {
    horasMap.set(f.mes, (horasMap.get(f.mes) ?? 0) + Number(f.totalHoras))
    usdMap.set(f.mes, (usdMap.get(f.mes) ?? 0) + Number(f.totalUSD))
    uyuMap.set(f.mes, (uyuMap.get(f.mes) ?? 0) + Number(f.totalUYU))
  }

  const horasDesarrolloPorMes = Array.from(horasMap.entries()).sort((a, b) => a[0] - b[0]).map(([mes, horas]) => ({ mes, horas }))

  let acumulado = 0
  const facturacionDesarrolloPorMes = Array.from(usdMap.keys()).sort((a, b) => a - b).map((mes) => {
    const totalUSD = usdMap.get(mes) ?? 0
    acumulado += totalUSD
    return { mes, totalUSD, acumulado }
  })

  const allMeses = new Set<number>([...mesSet, ...uyuMap.keys()])
  const resultadoFinancieroTotal = Array.from(allMeses).sort((a, b) => a - b).map((mes) => {
    const ingresosActivaciones = facturacionTotalRows.filter(r => r.mes === mes).reduce((s, r) => s + Number(r.totalSinIva), 0)
    const ingresosAdicionales = ingresosAdicRows.filter(r => r.mes === mes).reduce((s, r) => s + Number(r.montoSinIva), 0)
    const desarrolloUYU = uyuMap.get(mes) ?? 0
    const gastosVar = gastosRows.filter(r => r.mes === mes).reduce((s, r) => s + Number(r.importe), 0)
    const gastos = gastosVar + gastoFijoTotal
    const resultado = ingresosActivaciones + ingresosAdicionales + desarrolloUYU - gastos
    return { mes, ingresosActivaciones, ingresosAdicionales, desarrolloUYU, gastos, resultado }
  })

  // totalActByMes for comparative line
  const totalActByMes = new Map<number, number>()
  for (const r of activacionesPorMesEmpresa) totalActByMes.set(r.mes, (totalActByMes.get(r.mes) ?? 0) + r.cantidad)
  const activacionesTotalesPorMes = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: totalActByMes.get(i + 1) ?? 0 }))

  return {
    activacionesPorMesEmpresa,
    facturacionPorMesEmpresa,
    resultadoMensual,
    resultadoFinancieroTotal,
    horasDesarrolloPorMes,
    facturacionDesarrolloPorMes,
    activacionesTotalesPorMes,
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const anio = parseInt(searchParams.get('anio') ?? String(new Date().getFullYear()), 10)
  const empresaId = searchParams.get('empresaId') ?? undefined
  const anioComparativo = searchParams.get('anioComparativo') ? parseInt(searchParams.get('anioComparativo')!, 10) : null

  const [mainData, compData] = await Promise.all([
    calcAnio(anio, empresaId),
    anioComparativo ? calcAnio(anioComparativo, empresaId) : Promise.resolve(null),
  ])

  // distribucionSocios (only for main year, no comparative)
  const distribDesarrollo = await prisma.distribucionFactura.findMany({
    where: { factura: { anio, ...(empresaId ? { empresaId } : {}) } },
    select: { socio: { select: { nombre: true } }, montoUYU: true },
  })
  const socioMap = new Map<string, number>()
  for (const d of distribDesarrollo) {
    const nombre = d.socio.nombre
    socioMap.set(nombre, (socioMap.get(nombre) ?? 0) + Number(d.montoUYU))
  }
  const socios = await prisma.socio.findMany({ where: { activo: true }, select: { nombre: true, porcentajeParticipacion: true } })
  const totalResultado = mainData.resultadoMensual.reduce((s, r) => s + r.resultado, 0)
  for (const socio of socios) {
    const monto = totalResultado * Number(socio.porcentajeParticipacion)
    socioMap.set(socio.nombre, (socioMap.get(socio.nombre) ?? 0) + monto)
  }
  const distribucionSocios = Array.from(socioMap.entries()).map(([socio, monto]) => ({ socio, monto })).sort((a, b) => b.monto - a.monto)

  // issuesPorEstado
  const issuesGrouped = await prisma.issue.groupBy({
    by: ['estado'],
    where: { eliminado: false, fecha: { gte: new Date(`${anio}-01-01`), lt: new Date(`${anio + 1}-01-01`) } },
    _count: { estado: true },
  })
  const issuesPorEstado = issuesGrouped.map((g) => ({ estado: g.estado, count: g._count.estado }))

  return NextResponse.json({
    ...mainData,
    distribucionSocios,
    issuesPorEstado,
    comparativo: compData ? { anio: anioComparativo, ...compData } : null,
  })
}
