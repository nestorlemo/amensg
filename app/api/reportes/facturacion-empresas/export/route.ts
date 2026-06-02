import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const anio = parseInt(searchParams.get('anio') ?? '', 10)
  const mes = parseInt(searchParams.get('mes') ?? '', 10)

  if (!anio || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Año y mes son requeridos.' }, { status: 400 })
  }

  const precioParam = await prisma.parametro.findUnique({
    where: { clave: 'precio_unitario_activacion' },
    select: { valor: true },
  })

  const precioUnitario = precioParam ? Number(precioParam.valor) : 0
  const IVA_RATE = 0.22

  // Get all activaciones for the period with empresa info
  const activaciones = await prisma.activacionImportada.findMany({
    where: {
      anio,
      mes,
      importacion: { estado: { not: 'ANULADA' } },
      empresa: { activa: true },
    },
    select: {
      empresaId: true,
      fechaImportacion: true,
      empresa: { select: { nombre: true } },
    },
    orderBy: [{ empresa: { nombre: 'asc' } }, { fechaImportacion: 'asc' }],
  })

  // Group by empresa then by fechaImportacion
  const empresaMap = new Map<string, { nombre: string; fechas: Map<string, number> }>()

  for (const row of activaciones) {
    const dateKey = row.fechaImportacion.toISOString().split('T')[0]!
    let empresa = empresaMap.get(row.empresaId)
    if (!empresa) {
      empresa = { nombre: row.empresa.nombre, fechas: new Map() }
      empresaMap.set(row.empresaId, empresa)
    }
    empresa.fechas.set(dateKey, (empresa.fechas.get(dateKey) ?? 0) + 1)
  }

  const empresas = Array.from(empresaMap.values()).map(({ nombre, fechas }) => {
    const detalle = Array.from(fechas.entries()).map(([dateKey, cantidad]) => {
      const totalSinIva = round2(cantidad * precioUnitario)
      const iva = round2(totalSinIva * IVA_RATE)
      const totalConIva = round2(totalSinIva + iva)
      return {
        fecha: formatDate(dateKey),
        tipo: 'Activaciones',
        cantidad,
        totalSinIva,
        iva,
        totalConIva,
      }
    })

    const totalRegistros = detalle.reduce((s, d) => s + d.cantidad, 0)
    const totalSinIva = round2(detalle.reduce((s, d) => s + d.totalSinIva, 0))
    const iva = round2(totalSinIva * IVA_RATE)
    const totalConIva = round2(totalSinIva + iva)

    return { nombre, totalRegistros, totalSinIva, iva, totalConIva, detalle }
  })

  return NextResponse.json({ periodo: { anio, mes }, precioUnitario, empresas })
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
