import ExcelJS from 'exceljs'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const IVA_RATE = 0.22
const NUM_FMT = '#,##0.00'

const COLOR_DARK_BLUE = '1F3864'
const COLOR_MID_BLUE  = '2E75B6'
const COLOR_LIGHT_BG  = 'D9E1F2'
const COLOR_ALT_BG    = 'EEF2FF'
const COLOR_WHITE     = 'FFFFFFFF'

type Fill   = ExcelJS.Fill
type Font   = Partial<ExcelJS.Font>
type Align  = Partial<ExcelJS.Alignment>

function solidFill(argb: string): Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: argb.length === 6 ? `FF${argb}` : argb } }
}

function applyHeader(row: ExcelJS.Row, bgArgb: string) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = solidFill(bgArgb)
    cell.font = { bold: true, size: 11, color: { argb: COLOR_WHITE } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  row.height = 18
}

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const anio = parseInt(searchParams.get('anio') ?? '', 10)
  const mes  = parseInt(searchParams.get('mes')  ?? '', 10)

  if (!anio || !mes || mes < 1 || mes > 12) {
    return new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: 'Año y mes son requeridos.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const mesLabel = new Intl.DateTimeFormat('es-UY', { month: 'long' })
    .format(new Date(anio, mes - 1, 1))
  const mesStr = String(mes).padStart(2, '0')

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

  const wb = new ExcelJS.Workbook()
  wb.creator = 'AMENSG'
  wb.created = new Date()

  if (empresaMap.size === 0) {
    const ws = wb.addWorksheet('Sin datos')
    ws.addRow(['Sin datos para el período'])
  }

  for (const { nombre, fechas } of empresaMap.values()) {
    const detalle = Array.from(fechas.entries()).map(([dateKey, cantidad]) => {
      const totalSinIva = round2(cantidad * precioUnitario)
      const iva         = round2(totalSinIva * IVA_RATE)
      return { fecha: formatDate(dateKey), cantidad, totalSinIva, iva, totalConIva: round2(totalSinIva + iva) }
    })

    const totalRegistros = detalle.reduce((s, d) => s + d.cantidad, 0)
    const totalSinIva    = round2(detalle.reduce((s, d) => s + d.totalSinIva, 0))
    const iva            = round2(totalSinIva * IVA_RATE)
    const totalConIva    = round2(totalSinIva + iva)

    const ws = wb.addWorksheet(nombre.slice(0, 31))

    // Column widths
    ws.columns = [
      { key: 'a', width: 14 },
      { key: 'b', width: 16 },
      { key: 'c', width: 12 },
      { key: 'd', width: 16 },
      { key: 'e', width: 12 },
      { key: 'f', width: 16 },
    ]

    // Row 1 — title
    const row1 = ws.addRow([`Empresa: ${nombre}`, '', `Mes: ${mesLabel}`, '', `Año: ${anio}`, ''])
    row1.height = 22
    row1.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = solidFill(COLOR_DARK_BLUE)
      cell.font = { bold: true, size: 12, color: { argb: COLOR_WHITE } }
      cell.alignment = { vertical: 'middle' }
    })

    // Row 2 — empty
    ws.addRow([])

    // Row 3 — "TOTALES DEL MES" (merged A3:F3)
    const row3 = ws.addRow(['TOTALES DEL MES', '', '', '', '', ''])
    row3.height = 20
    ws.mergeCells('A3:F3')
    row3.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = solidFill(COLOR_DARK_BLUE)
      cell.font = { bold: true, size: 12, color: { argb: COLOR_WHITE } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // Row 4 — summary headers
    const row4 = ws.addRow(['Registros', '', 'Total S/IVA ($)', 'IVA ($)', 'Total C/IVA ($)', ''])
    applyHeader(row4, COLOR_MID_BLUE)

    // Row 5 — summary totals
    const row5 = ws.addRow([totalRegistros, '', totalSinIva, iva, totalConIva, ''])
    row5.height = 18
    row5.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = solidFill(COLOR_LIGHT_BG)
      cell.font = { bold: true, size: 11 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      if (typeof cell.value === 'number' && cell.value !== totalRegistros) {
        cell.numFmt = NUM_FMT
      }
    })

    // Row 6 — empty
    ws.addRow([])

    // Row 7 — detail headers
    const row7 = ws.addRow(['Fecha', 'Tipo', 'Cantidad', 'Total S/IVA ($)', 'IVA ($)', 'Total C/IVA ($)'])
    applyHeader(row7, COLOR_MID_BLUE)

    // Data rows
    detalle.forEach((d, i) => {
      const values = [d.fecha, 'Activaciones', d.cantidad, d.totalSinIva, d.iva, d.totalConIva]
      const dataRow = ws.addRow(values)
      const useAlt = i % 2 !== 0
      values.forEach((_, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1)
        if (useAlt) cell.fill = solidFill(COLOR_ALT_BG)
        if (typeof cell.value === 'number') {
          if (colIdx >= 2) {
            // col 3+ (0-indexed 2+): monetary or quantity
            cell.numFmt = colIdx >= 3 ? NUM_FMT : undefined as never
            cell.alignment = { horizontal: colIdx >= 3 ? 'right' : 'center', vertical: 'middle' }
          }
        } else {
          cell.alignment = { vertical: 'middle' }
        }
      })
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `facturacion-empresas-${anio}-${mesStr}.xlsx`

  return new Response(buffer as unknown as BodyInit, {
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
