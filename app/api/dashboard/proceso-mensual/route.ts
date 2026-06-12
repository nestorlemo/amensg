import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MESES      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_ABR  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)

  // Default: mes anterior al actual
  const now = new Date()
  let anio = searchParams.get('anio') ? parseInt(searchParams.get('anio')!) : now.getFullYear()
  let mes  = searchParams.get('mes')  ? parseInt(searchParams.get('mes')!)  : now.getMonth()
  if (!searchParams.get('mes')) {
    if (now.getMonth() === 0) { mes = 12; anio = now.getFullYear() - 1 }
    else mes = now.getMonth()
  }

  const mesNombre = MESES[mes - 1] ?? ''
  const mesAbrev  = MESES_ABR[mes - 1] ?? ''
  const periodoStr      = `${mesNombre} ${anio}`
  const periodoStrAbrev = `${mesAbrev} ${anio}`

  // fechaProduccion range for issues
  const fechaInicio = new Date(anio, mes - 1, 1)
  const fechaFin    = new Date(anio, mes, 1)

  const [
    issuesPendientesCount,
    issuesEnProduccionSinFacturarCount,
    issuesEnDesarrolloCount,
    cierreMensual,
    transferenciasCount,
    cierresSocioCount,
    facturacionesSinCobro,
    facturacionesTotales,
  ] = await Promise.all([
    // PENDIENTE: not started
    prisma.issue.count({
      where: { eliminado: false, estado: 'PENDIENTE', fechaProduccion: null },
    }),
    // EN_PRODUCCION sin FacturaDesarrollo (filtrando por fechaProduccion del período)
    prisma.issue.count({
      where: {
        eliminado: false,
        estado: 'EN_PRODUCCION',
        facturaIssues: { none: {} },
        fechaProduccion: { gte: fechaInicio, lt: fechaFin },
      },
    }),
    // EN_DESARROLLO: in progress
    prisma.issue.count({
      where: { eliminado: false, estado: 'EN_DESARROLLO' },
    }),
    prisma.cierreMensual.findUnique({
      where: { anio_mes: { anio, mes } },
      select: { estado: true, cerradoAt: true },
    }),
    prisma.transferencia.count({
      where: {
        OR: [
          { concepto: { contains: periodoStr } },
          { concepto: { contains: periodoStrAbrev } },
        ],
      },
    }),
    // Expected transferencias: count CierreSocio for this period (one per socio)
    prisma.cierreSocio.count({
      where: { cierreMensual: { anio, mes } },
    }),
    prisma.facturacionMensual.count({
      where: {
        anio,
        mes,
        cobroFacturaciones: { none: {} },
        importacion: { estado: { not: 'ANULADA' } },
      },
    }),
    prisma.facturacionMensual.count({
      where: {
        anio,
        mes,
        importacion: { estado: { not: 'ANULADA' } },
      },
    }),
  ])

  const transferPendientes = Math.max(0, cierresSocioCount - transferenciasCount)
  const transferCompletas  = transferPendientes === 0 && cierresSocioCount > 0

  const facturacionCompleta = facturacionesSinCobro === 0 && facturacionesTotales > 0

  return NextResponse.json({
    periodo: { anio, mes, nombre: periodoStr },
    issuesFacturables: {
      pendientes:               issuesPendientesCount,
      enProduccionSinFacturar:  issuesEnProduccionSinFacturarCount,
      enDesarrollo:             issuesEnDesarrolloCount,
    },
    liquidacion: {
      periodo:      cierreMensual ? periodoStr : null,
      fechaCierre:  cierreMensual?.cerradoAt?.toISOString() ?? null,
    },
    transferencias: {
      completas:  transferCompletas,
      pendientes: transferPendientes,
    },
    facturacionActivaciones: {
      completas: facturacionCompleta,
      pendientes: facturacionesSinCobro,
    },
  })
}
