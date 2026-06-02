import * as XLSX from 'xlsx'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const IVA_RATE = 0.22
const NUM_FMT = '#,##0.00'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const anio = parseInt(searchParams.get('anio') ?? '', 10)
  const mes = parseInt(searchParams.get('mes') ?? '', 10)

  if (!anio || !mes || mes < 1 || mes > 12) {
    return new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: 'Año y mes son requeridos.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const precioParam = await prisma.parametro.findUnique({
    where: { clave: 'precio_unitario_activacion' },
    select: { valor: true },
  })
  const precioUnitario = precioParam ? Number(precioParam.valor) : 0

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

  const empresaMap = new Map<string, { nombre: string; fechas: Map<string, number> }>()
  for (const row of activaciones) {
    const dateKey = row.fechaImportacion.toISOString().split('T')[0]!
    let emp = empresaMap.get(row.empresaId)
    if (!emp) {
      emp = { nombre: row.empresa.nombre, fechas: new Map() }
      empresaMap.set(row.empresaId, emp)
    }
    emp.fechas.set(dateKey, (emp.fechas.get(dateKey) ?? 0) + 1)
  }

  const wb = XLSX.utils.book_new()
  const mesStr = String(mes).padStart(2, '0')

  for (const { nombre, fechas } of empresaMap.values()) {
    const detalle = Array.from(fechas.entries()).map(([dateKey, cantidad]) => {
      const totalSinIva = round2(cantidad * precioUnitario)
      const iva = round2(totalSinIva * IVA_RATE)
      return { fecha: formatDate(dateKey), cantidad, totalSinIva, iva, totalConIva: round2(totalSinIva + iva) }
    })

    const totalRegistros = detalle.reduce((s, d) => s + d.cantidad, 0)
    const totalSinIva = round2(detalle.reduce((s, d) => s + d.totalSinIva, 0))
    const iva = round2(totalSinIva * IVA_RATE)
    const totalConIva = round2(totalSinIva + iva)

    const rows: unknown[][] = [
      [`Empresa: ${nombre}   Mes: ${mesStr}   Año: ${anio}`],
      [],
      ['TOTALES DEL MES'],
      ['Registros', '', 'Total S/IVA ($)', 'IVA ($)', 'Total C/IVA ($)'],
      [totalRegistros, '', totalSinIva, iva, totalConIva],
      [],
      ['Fecha', 'Tipo', 'Cantidad', 'Total S/IVA ($)', 'IVA ($)', 'Total C/IVA ($)'],
      ...detalle.map((d) => [d.fecha, 'Activaciones', d.cantidad, d.totalSinIva, d.iva, d.totalConIva]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Bold: row 1 (title), row 3 (TOTALES), row 4 (summary headers), row 7 (detail headers)
    const boldRows = [0, 2, 3, 6]
    for (const r of boldRows) {
      for (let c = 0; c < 6; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (ws[addr]) {
          ws[addr].s = { font: { bold: true } }
        }
      }
    }

    // Number format for monetary columns
    const numCols = [2, 3, 4, 5]
    for (let r = 4; r < rows.length; r++) {
      for (const c of numCols) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (ws[addr] && typeof ws[addr].v === 'number') {
          ws[addr].z = NUM_FMT
        }
      }
    }

    // Column widths
    ws['!cols'] = [
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
    ]

    const sheetName = nombre.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sin datos para el período']]), 'Sin datos')
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `facturacion-empresas-${anio}-${mesStr}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

