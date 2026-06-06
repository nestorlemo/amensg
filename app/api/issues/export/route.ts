import ExcelJS from 'exceljs'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 }
const ALT_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFC8D0E0' } },
  left:   { style: 'thin', color: { argb: 'FFC8D0E0' } },
  bottom: { style: 'thin', color: { argb: 'FFC8D0E0' } },
  right:  { style: 'thin', color: { argb: 'FFC8D0E0' } },
}

function fmtDate(date: Date | null): string {
  if (!date) return ''
  const d = date.toISOString().split('T')[0]!
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const estado      = searchParams.get('estado')      ?? undefined
  const empresaId   = searchParams.get('empresaId')   ?? undefined
  const prioridad   = searchParams.get('prioridad')   ?? undefined
  const fechaDesde  = searchParams.get('fechaDesde')  ?? undefined
  const fechaHasta  = searchParams.get('fechaHasta')  ?? undefined
  const facturacion = searchParams.get('facturacion') ?? undefined
  const sistema     = searchParams.get('sistema')     ?? undefined

  const where: Record<string, unknown> = { eliminado: false }
  if (estado)    where.estado    = estado
  if (empresaId) where.empresaId = empresaId
  if (prioridad) where.prioridad = prioridad
  if (sistema)   where.sistema   = sistema
  if (fechaDesde || fechaHasta) {
    const range: Record<string, Date> = {}
    if (fechaDesde) range.gte = new Date(fechaDesde)
    if (fechaHasta) {
      const hasta = new Date(fechaHasta)
      hasta.setDate(hasta.getDate() + 1)
      range.lt = hasta
    }
    where.fechaProduccion = range
  }
  if (facturacion === 'sin_facturar') where.facturaIssues = { none: {} }
  if (facturacion === 'facturado')    where.facturaIssues = { some: {} }

  const [issues, valorHoraParam] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: { empresa: { select: { nombre: true } } },
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    }),
    prisma.parametro.findUnique({ where: { clave: 'VALOR_HORA_DESARROLLO_USD' } }),
  ])

  const valorHoraUSD = valorHoraParam ? Number(valorHoraParam.valor) : 45
  const totDev    = issues.reduce((s, i) => s + Number(i.horasDesarrollo), 0)
  const totTest   = issues.reduce((s, i) => s + Number(i.horasTest),       0)
  const totRework = issues.reduce((s, i) => s + Number(i.horasRework),     0)
  const totTotal  = issues.reduce((s, i) => s + Number(i.totalHoras),      0)
  const totUSD    = Math.round(totTotal * valorHoraUSD * 100) / 100

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Issues')

  // Column widths
  ws.columns = [
    { width: 12 }, // A Fecha reg.
    { width: 12 }, // B Fecha prod.
    { width: 50 }, // C Descripción
    { width: 20 }, // D Empresa
    { width: 22 }, // E Sistema
    { width: 14 }, // F Hs. Desarrollo
    { width: 12 }, // G Hs. Test
    { width: 12 }, // H Hs. Rework
    { width: 12 }, // I Total Horas
    { width: 16 }, // J Estado
    { width: 18 }, // K Reportado por
    { width: 12 }, // L Prioridad
  ]

  // Header row
  const headers = ['Fecha reg.', 'Fecha prod.', 'Descripción', 'Empresa', 'Sistema',
    'Hs. Desarrollo', 'Hs. Test', 'Hs. Rework', 'Total Horas', 'Estado', 'Reportado por', 'Prioridad']
  const headerRow = ws.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 20

  // Data rows
  issues.forEach((issue, idx) => {
    const row = ws.addRow([
      fmtDate(issue.fecha),
      fmtDate(issue.fechaProduccion),
      issue.descripcion,
      issue.empresa?.nombre ?? '',
      (issue as unknown as { sistema?: string | null }).sistema ?? '',
      Number(issue.horasDesarrollo),
      Number(issue.horasTest),
      Number(issue.horasRework),
      Number(issue.totalHoras),
      issue.estado.replace(/_/g, ' '),
      issue.reportadoPor,
      issue.prioridad,
    ])
    const fill: ExcelJS.Fill = idx % 2 === 0
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      : ALT_FILL
    row.eachCell((cell) => {
      cell.fill = fill
      cell.border = THIN_BORDER
      cell.font = { name: 'Arial', size: 11 }
    })
    // Right-align numeric columns F-I
    for (let c = 6; c <= 9; c++) {
      const cell = row.getCell(c)
      cell.alignment = { horizontal: 'right' }
      cell.numFmt = '#,##0.00'
    }
    // String format for dates
    row.getCell(1).alignment = { horizontal: 'center' }
    row.getCell(2).alignment = { horizontal: 'center' }
  })

  // Totals row 1: TOTAL (X issues)
  const totRow1 = ws.addRow([
    `TOTAL (${issues.length} issues)`, '', '', '', '',
    totDev, totTest, totRework, totTotal,
    '', '', '',
  ])
  totRow1.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
  })
  ws.mergeCells(`A${totRow1.number}:E${totRow1.number}`)
  ws.mergeCells(`J${totRow1.number}:L${totRow1.number}`)
  for (let c = 6; c <= 9; c++) {
    const cell = totRow1.getCell(c)
    cell.alignment = { horizontal: 'right' }
    cell.numFmt = '#,##0.00'
  }
  totRow1.getCell(1).alignment = { horizontal: 'left' }

  // Totals row 2: TOTAL SIN IVA
  const usdFormatted = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totUSD)
  const totRow2 = ws.addRow([
    'TOTAL SIN IVA', '', '', '', '', '', '', '',
    `USD ${usdFormatted}`,
    '', '', '',
  ])
  totRow2.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
  })
  ws.mergeCells(`A${totRow2.number}:H${totRow2.number}`)
  ws.mergeCells(`J${totRow2.number}:L${totRow2.number}`)
  totRow2.getCell(1).alignment = { horizontal: 'left' }
  totRow2.getCell(9).alignment = { horizontal: 'right' }

  const dateStr = new Date().toISOString().split('T')[0]!
  const buffer = await wb.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="issues-${dateStr}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
