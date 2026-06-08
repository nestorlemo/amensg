import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function dec2(v: number) {
  return v.toFixed(2)
}

async function calcMes(anio: number, mes: number, tipoCambio: number) {
  const [cobros, gastosVar, gastosFijosConceptos] = await Promise.all([
    prisma.cobro.findMany({
      where: { anio, mes },
      select: { tipo: true, estado: true, montoConIva: true, montoSinIva: true, moneda: true },
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

  function toUYU(monto: number, moneda: string) {
    return moneda === 'USD' ? monto * tipoCambio : monto
  }

  const actCobradas   = cobros.filter(c => c.tipo === 'ACTIVACIONES' && c.estado === 'COBRADO')
  const actPendientes = cobros.filter(c => c.tipo === 'ACTIVACIONES' && c.estado === 'FACTURADO')
  const devCobrado    = cobros.filter(c => c.tipo === 'DESARROLLO'   && c.estado === 'COBRADO')
  const devPendiente  = cobros.filter(c => c.tipo === 'DESARROLLO'   && c.estado === 'FACTURADO')

  const activacionesCobradas   = actCobradas.reduce((s, c)   => s + toUYU(Number(c.montoConIva), c.moneda), 0)
  const activacionesPendientes = actPendientes.reduce((s, c) => s + toUYU(Number(c.montoConIva), c.moneda), 0)
  const desarrolloCobrado      = devCobrado.reduce((s, c)    => s + toUYU(Number(c.montoConIva), c.moneda), 0)
  const desarrolloPendiente    = devPendiente.reduce((s, c)  => s + toUYU(Number(c.montoConIva), c.moneda), 0)

  // For resultado: use s/IVA amounts
  const actCobSinIva  = actCobradas.reduce((s, c)   => s + toUYU(Number(c.montoSinIva), c.moneda), 0)
  const actPendSinIva = actPendientes.reduce((s, c) => s + toUYU(Number(c.montoSinIva), c.moneda), 0)
  const devCobSinIva  = devCobrado.reduce((s, c)    => s + toUYU(Number(c.montoSinIva), c.moneda), 0)
  const devPendSinIva = devPendiente.reduce((s, c)  => s + toUYU(Number(c.montoSinIva), c.moneda), 0)
  const ingresosEsperadosSinIva = actCobSinIva + actPendSinIva + devCobSinIva + devPendSinIva

  // Desarrollo: primary display is USD, secondary is UYU
  const desarrolloPendienteUSD = devPendiente.reduce((s, c) => s + Number(c.montoConIva), 0)
  const desarrolloPendienteUYU = devPendiente.reduce((s, c) => s + toUYU(Number(c.montoConIva), c.moneda), 0)

  const gastosVariables = gastosVar.reduce((s, g) => s + Number(g.importe), 0)
  const gastosFijosMonto = gastosFijosConceptos.reduce((s, g) => s + Number(g.monto ?? 0), 0)
  const gastosTotales = gastosVariables + gastosFijosMonto

  return {
    activacionesCobradas:   dec2(activacionesCobradas),
    activacionesPendientes: dec2(activacionesPendientes),
    desarrolloCobrado:      dec2(desarrolloCobrado),
    desarrolloPendiente:    dec2(desarrolloPendiente),
    desarrolloPendienteUSD: dec2(desarrolloPendienteUSD),
    desarrolloPendienteUYU: dec2(desarrolloPendienteUYU),
    gastosFijos:            dec2(gastosTotales),
    resultadoEstimado:      dec2(ingresosEsperadosSinIva - gastosTotales),
  }
}

export async function GET() {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const ahora = new Date()
  let anio = ahora.getFullYear()
  let mes = ahora.getMonth() + 1

  const tieneCobrosMesActual = await prisma.cobro.count({ where: { anio, mes } })
  if (tieneCobrosMesActual === 0) {
    mes -= 1
    if (mes === 0) { mes = 12; anio -= 1 }
  }

  // Find the last month with cobros before the current period
  const ultimoCobroAnterior = await prisma.cobro.findFirst({
    where: { OR: [{ anio: { lt: anio } }, { anio, mes: { lt: mes } }] },
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    select: { anio: true, mes: true },
  })
  const mesAnterior = ultimoCobroAnterior ?? (mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 })

  const tipoCambioParam = await prisma.parametro.findUnique({
    where: { clave: 'tipo_cambio_usd' },
    select: { valor: true },
  })
  const tipoCambio = tipoCambioParam ? Number(tipoCambioParam.valor) : 0

  const [actual, anterior] = await Promise.all([
    calcMes(anio, mes, tipoCambio),
    calcMes(mesAnterior.anio, mesAnterior.mes, tipoCambio),
  ])

  return NextResponse.json({
    periodo: { anio, mes },
    ...actual,
    mesAnterior: {
      activacionesCobradas: anterior.activacionesCobradas,
      resultadoDistribuible: anterior.resultadoEstimado,
    },
  })
}
