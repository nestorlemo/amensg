import { NextResponse } from 'next/server'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// GET /api/importaciones/existe?empresa=NombreEmpresa&anio=2025&mes=6
// Returns { existe: boolean, importacionId?: string }
export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const empresa = searchParams.get('empresa')
  const anioStr = searchParams.get('anio')
  const mesStr = searchParams.get('mes')

  if (!empresa || !anioStr || !mesStr) {
    return NextResponse.json({ error: 'Parámetros requeridos: empresa, anio, mes.' }, { status: 400 })
  }

  const anio = Number(anioStr)
  const mes = Number(mesStr)

  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'anio y mes deben ser números válidos.' }, { status: 400 })
  }

  // Check if there's a confirmed (non-ANULADA) importacion that has activaciones for this company+period
  const existing = await prisma.activacionImportada.findFirst({
    where: {
      empresa: { nombre: empresa },
      anio,
      mes,
      importacion: { estado: { not: 'ANULADA' } },
    },
    select: {
      importacionId: true,
      importacion: { select: { id: true, estado: true } },
    },
  })

  if (!existing) {
    return NextResponse.json({ existe: false })
  }

  return NextResponse.json({
    existe: true,
    importacionId: existing.importacionId,
  })
}
