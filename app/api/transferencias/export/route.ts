import ExcelJS from 'exceljs'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 }
const ALT_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
const TOTAL_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1769E0' } }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFC8D0E0' } },
  left:   { style: 'thin', color: { argb: 'FFC8D0E0' } },
  bottom: { style: 'thin', color: { argb: 'FFC8D0E0' } },
  right:  { style: 'thin', color: { argb: 'FFC8D0E0' } },
}

function fmtDate(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date).toISOString().split('T')[0]!
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const MESES_EXPORT = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const { searchParams } = new URL(request.url)
  const socioId = searchParams.get('socioId') ?? undefined
  const moneda  = searchParams.get('moneda')  ?? undefined
  const estado  = searchParams.get('estado')  ?? undefined
  const anio    = searchParams.get('anio')    ? parseInt(searchParams.get('anio')!)    : undefined
  const mes     = searchParams.get('mes')     ? parseInt(searchParams.get('mes')!)     : undefined

  const where: Record<string, unknown> = {}
  if (socioId) where.socioId = socioId
  if (moneda)  where.moneda  = moneda
  if (estado)  where.estado  = estado
  if (anio || mes) {
    const conceptoFilter = anio && mes
      ? { concepto: { contains: `${MESES_EXPORT[mes - 1] ?? ''} ${anio}` } }
      : anio
        ? { concepto: { contains: String(anio) } }
        : { concepto: { contains: MESES_EXPORT[(mes ?? 1) - 1] ?? '' } }

    where.OR = [
      {
        cobrosCobro: {
          some: {
            cobro: {
              ...(anio ? { anio } : {}),
              ...(mes  ? { mes  } : {}),
            },
          },
        },
      },
      conceptoFilter,
    ]
  }

  const transferencias = await prisma.transferencia.findMany({
    where,
    include: {
      socio: { select: { id: true, nombre: true } },
      cobro: { select: { anio: true, mes: true, empresa: { select: { nombre: true } } } },
    },
    orderBy: [{ socio: { nombre: 'asc' } }, { cobro: { anio: 'desc' } }, { cobro: { mes: 'desc' } }],
  })

  // Group by socio
  const bySocio = new Map<string, { nombre: string; rows: typeof transferencias }>()
  for (const t of transferencias) {
    const entry = bySocio.get(t.socioId) ?? { nombre: t.socio.nombre, rows: [] }
    entry.rows.push(t)
    bySocio.set(t.socioId, entry)
  }

  const wb = new ExcelJS.Workbook()

  for (const [, { nombre, rows }] of bySocio.entries()) {
    const sheetName = nombre.slice(0, 31)
    const ws = wb.addWorksheet(sheetName)

    ws.columns = [
      { width: 14 }, // Fecha
      { width: 45 }, // Concepto
      { width: 10 }, // Moneda
      { width: 16 }, // Monto S/IVA
      { width: 28 }, // Cuenta destino
      { width: 14 }, // Estado
    ]

    const headers = ['Fecha', 'Concepto', 'Moneda', 'Monto S/IVA', 'Cuenta destino', 'Estado']
    const headerRow = ws.addRow(headers)
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = THIN_BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    headerRow.height = 20

    rows.forEach((t, idx) => {
      const row = ws.addRow([
        fmtDate(t.fecha),
        t.concepto,
        t.moneda,
        Number(t.monto),
        t.cuentaDestino ?? '',
        t.estado,
      ])
      const fill: ExcelJS.Fill = idx % 2 === 0
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
        : ALT_FILL
      row.eachCell((cell) => {
        cell.fill = fill
        cell.border = THIN_BORDER
        cell.font = { name: 'Arial', size: 11 }
      })
      row.getCell(1).alignment = { horizontal: 'center' }
      row.getCell(4).alignment = { horizontal: 'right' }
      row.getCell(4).numFmt = '#,##0.00'
    })

    // Totals per currency
    const uyu = rows.filter(r => r.moneda === 'UYU').reduce((s, r) => s + Number(r.monto), 0)
    const usd = rows.filter(r => r.moneda === 'USD').reduce((s, r) => s + Number(r.monto), 0)

    const addTotalRow = (label: string, value: number) => {
      const tr = ws.addRow([label, '', '', value, '', ''])
      tr.eachCell((cell) => {
        cell.fill = TOTAL_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
      })
      ws.mergeCells(`A${tr.number}:C${tr.number}`)
      ws.mergeCells(`E${tr.number}:F${tr.number}`)
      tr.getCell(1).alignment = { horizontal: 'left' }
      tr.getCell(4).alignment = { horizontal: 'right' }
      tr.getCell(4).numFmt = '#,##0.00'
    }

    if (uyu > 0) addTotalRow('TOTAL UYU', uyu)
    if (usd > 0) addTotalRow('TOTAL USD', usd)
  }

  if (wb.worksheets.length === 0) {
    const ws = wb.addWorksheet('Sin datos')
    ws.addRow(['No hay transferencias para los filtros seleccionados.'])
  }

  const dateStr = new Date().toISOString().split('T')[0]!
  const buffer = await wb.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="transferencias-${dateStr}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
