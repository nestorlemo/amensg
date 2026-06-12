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
  let mes  = searchParams.get('mes')  ? parseInt(searchParams.get('mes')!)  : now.getMonth() // getMonth() is 0-based, so .getMonth() = mes anterior (1-based)
  if (!searchParams.get('mes')) {
    if (now.getMonth() === 0) { mes = 12; anio = now.getFullYear() - 1 }
    else mes = now.getMonth()
  }

  const mesNombre = MESES[mes - 1] ?? ''
  const mesAbrev  = MESES_ABR[mes - 1] ?? ''
  const periodoStr = `${mesNombre} ${anio}`
  // Flujo viejo (buildConcepto): "Activaciones May-May 2026" o "Activaciones May 2026"
  const periodoStrAbrev = `${mesAbrev} ${anio}`

  // Rango de fechaProduccion para el período (para issues)
  const fechaInicio = new Date(anio, mes - 1, 1)
  const fechaFin    = new Date(anio, mes, 1) // exclusive

  const [
    empresasActivas,
    importacionesExistentes,
    issuesPendientes,
    cierreMensual,
    transferenciasCount,
    facturacionesSinCobro,
  ] = await Promise.all([
    prisma.empresa.findMany({
      where: { activa: true },
      select: { id: true, nombre: true },
    }),
    prisma.activacionImportada.findMany({
      where: {
        anio,
        mes,
        importacion: { estado: { not: 'ANULADA' } },
      },
      select: { empresaId: true },
      distinct: ['empresaId'],
    }),
    prisma.issue.count({
      where: {
        eliminado: false,
        estado: 'EN_PRODUCCION',
        facturaIssues: { none: {} },
        fechaProduccion: { gte: fechaInicio, lt: fechaFin },
      },
    }),
    prisma.cierreMensual.findUnique({
      where: { anio_mes: { anio, mes } },
      select: { estado: true },
    }),
    prisma.transferencia.count({
      where: {
        OR: [
          { concepto: { contains: periodoStr } },      // "Activaciones Mayo 2026"
          { concepto: { contains: periodoStrAbrev } }, // "Activaciones May-May 2026" / "Activaciones May 2026"
        ],
      },
    }),
    prisma.facturacionMensual.count({
      where: {
        anio,
        mes,
        cobroFacturaciones: { none: {} },
        importacion: { estado: { not: 'ANULADA' } },
      },
    }),
  ])

  const importadasIds = new Set(importacionesExistentes.map((i) => i.empresaId))
  const empresasFaltantes = empresasActivas
    .filter((e) => !importadasIds.has(e.id))
    .map((e) => e.nombre)

  return NextResponse.json({
    periodo: { anio, mes, nombre: periodoStr },
    importacion: {
      completo: empresasFaltantes.length === 0,
      empresasFaltantes,
    },
    issuesFacturables: { cantidad: issuesPendientes },
    liquidacion: {
      existe: cierreMensual !== null,
      estado: cierreMensual?.estado ?? null,
    },
    transferencias: {
      generadas: transferenciasCount > 0,
      cantidad: transferenciasCount,
    },
    facturacionActivaciones: { pendientes: facturacionesSinCobro },
  })
}
