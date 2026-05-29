import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { getReportCsv, type ReportSlug } from '@/lib/reportes'

export const runtime = 'nodejs'

const reportSlugs = new Set<ReportSlug>([
  'mensual-empresa',
  'activaciones',
  'facturacion',
  'cobros-pendientes',
  'gastos',
  'ingresos-adicionales',
  'liquidacion',
])

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error
  const { slug } = await context.params
  if (!reportSlugs.has(slug as ReportSlug)) {
    return NextResponse.json({ error: 'REPORTE_NO_ENCONTRADO' }, { status: 404 })
  }

  const csv = await getReportCsv(slug as ReportSlug, new URL(request.url).searchParams)
  return new Response(csv, {
    headers: {
      'Content-Disposition': `attachment; filename="reporte-${slug}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
  })
}
