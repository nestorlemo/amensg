import { NextRequest, NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const anio = parseInt(searchParams.get('anio') ?? '')
  const mes  = parseInt(searchParams.get('mes')  ?? '')

  if (!anio || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'Parámetros anio y mes requeridos.' }, { status: 422 })
  }

  const cierre = await prisma.cierreMensual.findUnique({
    where: { anio_mes: { anio, mes } },
    include: {
      cierresSocio: {
        include: { socio: { select: { id: true, nombre: true, cuentas: true } } },
      },
    },
  })

  if (!cierre) {
    return NextResponse.json({ error: 'No existe cierre para el período indicado.', code: 'CIERRE_NO_ENCONTRADO' }, { status: 404 })
  }

  if (cierre.estado.trim().toUpperCase() !== 'CERRADO') {
    return NextResponse.json({ error: 'El período no está cerrado. Solo se pueden generar transferencias desde períodos cerrados.', code: 'CIERRE_NO_CERRADO' }, { status: 422 })
  }

  // Check which socios already have transferencias for this period
  // New-flow transferencias have no cobro, so we match by concepto containing the period label
  const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const periodoStr = `${MESES_LABEL[mes - 1] ?? ''} ${anio}`
  const existentes = await prisma.transferencia.findMany({
    where: { concepto: { contains: periodoStr } },
    select: { socioId: true, moneda: true },
  })
  const existenteSet = new Set(existentes.map(t => `${t.socioId}:${t.moneda}`))

  const socios = cierre.cierresSocio.map((cs) => {
    const snap = cs.snapshot as Record<string, unknown>
    // Prefer new desglose fields; fall back to old fields for historical cierres
    const montoPesos = ((snap.montoActivaciones ?? snap.montoPesos) as string | null)
    const montoUsd   = ((snap.montoDesarrolloUSD ?? snap.montoUsd)  as string | null)
    const cuentas    = cs.socio.cuentas as Record<string, string> | null

    return {
      socioId:       cs.socio.id,
      socioNombre:   cs.socio.nombre,
      montoPesos:    montoPesos ?? '0.00',
      montoUsd:      montoUsd ?? null,
      cuentaPesos:   cuentas?.pesos ?? cuentas?.UYU ?? null,
      cuentaUsd:     cuentas?.usd   ?? cuentas?.USD ?? null,
      yaExisteUYU:   existenteSet.has(`${cs.socio.id}:UYU`),
      yaExisteUSD:   existenteSet.has(`${cs.socio.id}:USD`),
    }
  })

  return NextResponse.json({ anio, mes, estado: cierre.estado, socios })
}
