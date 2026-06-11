import ExcelJS from 'exceljs'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 }
const SECTION_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
const TOTAL_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1769E0' } }
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFC8D0E0' } },
  left:   { style: 'thin', color: { argb: 'FFC8D0E0' } },
  bottom: { style: 'thin', color: { argb: 'FFC8D0E0' } },
  right:  { style: 'thin', color: { argb: 'FFC8D0E0' } },
}

function mesLabel(mes: number, abrev = false) {
  return abrev ? (MESES_ABR[mes - 1] ?? '') : (MESES[mes - 1] ?? '')
}

function periodoFromConcepto(concepto: string): { anio: number; mes: number } | null {
  const match = concepto.match(/([A-Za-záéíóúÁÉÍÓÚ]+)\s+(\d{4})$/)
  if (!match) return null
  const mesIdx = MESES.findIndex(m => m.toLowerCase() === (match[1] ?? '').toLowerCase())
  if (mesIdx === -1) return null
  return { anio: parseInt(match[2]!), mes: mesIdx + 1 }
}

function styleDataRow(row: ExcelJS.Row, numericCols: number[] = []) {
  row.eachCell((cell) => {
    cell.border = THIN_BORDER
    cell.font = { name: 'Arial', size: 11 }
  })
  numericCols.forEach(col => {
    row.getCell(col).alignment = { horizontal: 'right' }
    row.getCell(col).numFmt = '#,##0.00'
  })
}

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const { id } = await params

  const t = await prisma.transferencia.findUnique({
    where: { id },
    include: {
      socio: { select: { nombre: true } },
      cobro: { select: { anio: true, mes: true } },
      cobrosCobro: {
        include: {
          cobro: {
            select: {
              anio: true, mes: true, tipo: true,
              empresa: { select: { nombre: true } },
              montoSinIva: true, moneda: true,
            },
          },
        },
      },
    },
  })

  if (!t) {
    return new Response('Not found', { status: 404 })
  }

  // Determine period
  const cobrosVinculados = t.cobrosCobro.map(tc => tc.cobro)
  const sorted = [...cobrosVinculados].sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes)
  const desde = sorted[0]
    ?? (t.cobro ? { anio: t.cobro.anio, mes: t.cobro.mes } : null)
    ?? periodoFromConcepto(t.concepto)
    ?? { anio: new Date().getFullYear(), mes: new Date().getMonth() + 1 }

  const periodoStr = `${mesLabel(desde.mes)} ${desde.anio}`

  // Load CierreMensual + CierreSocio for this period / socio
  const cierre = await prisma.cierreMensual.findFirst({
    where: { anio: desde.anio, mes: desde.mes },
    select: { id: true, snapshot: true },
  })

  let facturacionSinIva = '0.00'
  let totalGastos = '0.00'
  let resultadoActivaciones = '0.00'
  let socioPorcentaje: string | null = null

  if (cierre) {
    const snap = (cierre.snapshot ?? {}) as Record<string, unknown>
    const ingresosSnap = (snap.ingresos ?? {}) as Record<string, unknown>
    facturacionSinIva = String(ingresosSnap.facturacionSinIva ?? snap.totalIngresosSinIva ?? '0.00')
    totalGastos = String(snap.totalGastos ?? '0.00')
    resultadoActivaciones = (Number(facturacionSinIva) - Number(totalGastos)).toFixed(2)

    const cs = await prisma.cierreSocio.findFirst({
      where: { cierreMensualId: cierre.id, socioId: t.socioId },
      select: { snapshot: true },
    })
    const csSnap = (cs?.snapshot ?? {}) as Record<string, unknown>
    socioPorcentaje = csSnap.socioPorcentaje != null ? String(csSnap.socioPorcentaje) : null
  }

  const pctDisplay = socioPorcentaje != null
    ? `${(Number(socioPorcentaje) * 100).toFixed(2)}%`
    : '—'

  const wb = new ExcelJS.Workbook()

  // ── Hoja 1: Resumen ────────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet('Resumen')
  ws1.columns = [{ width: 36 }, { width: 20 }]

  const addTitleRow = (label: string) => {
    const row = ws1.addRow([label, ''])
    row.eachCell(cell => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = THIN_BORDER
    })
    ws1.mergeCells(`A${row.number}:B${row.number}`)
    row.height = 18
  }

  const addDataRow = (label: string, value: string | number, highlight = false) => {
    const row = ws1.addRow([label, value])
    row.eachCell(cell => {
      cell.border = THIN_BORDER
      cell.font = highlight
        ? { ...HEADER_FONT, color: { argb: 'FFFFFFFF' } }
        : { name: 'Arial', size: 11 }
      cell.fill = highlight ? TOTAL_FILL : SECTION_FILL
    })
    if (typeof value === 'number') {
      row.getCell(2).numFmt = '#,##0.00'
      row.getCell(2).alignment = { horizontal: 'right' }
    }
  }

  addTitleRow(`Transferencia — ${t.socio.nombre} — ${periodoStr}`)
  ws1.addRow([])

  addTitleRow('Datos del socio')
  addDataRow('Socio', t.socio.nombre)
  addDataRow('Período', periodoStr)
  addDataRow('Porcentaje de participación', pctDisplay)
  ws1.addRow([])

  addTitleRow('Resumen del período')
  addDataRow('Total activaciones s/IVA', Number(facturacionSinIva))
  addDataRow('Total gastos', Number(totalGastos))
  addDataRow('Resultado activaciones neto', Number(resultadoActivaciones))
  ws1.addRow([])

  addTitleRow('Transferencia')
  addDataRow(`Monto transferido al socio (${t.moneda})`, Number(t.monto), true)

  // ── Hoja 2: Detalle de cobros ──────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Detalle cobros')
  ws2.columns = [{ width: 30 }, { width: 16 }, { width: 14 }, { width: 18 }]

  const headerRow = ws2.addRow(['Empresa', 'Tipo', 'Período', 'Monto S/IVA'])
  headerRow.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 20

  if (cobrosVinculados.length === 0) {
    ws2.addRow(['Sin cobros vinculados', '', '', ''])
  } else {
    cobrosVinculados.forEach((c, idx) => {
      const row = ws2.addRow([
        c.empresa.nombre,
        c.tipo,
        `${mesLabel(c.mes, true)} ${c.anio}`,
        Number(c.montoSinIva),
      ])
      const fill: ExcelJS.Fill = idx % 2 === 0
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
      styleDataRow(row, [4])
      row.eachCell(cell => { cell.fill = fill })
    })

    const total = cobrosVinculados.reduce((s, c) => s + Number(c.montoSinIva), 0)
    const totalRow = ws2.addRow(['', '', 'TOTAL', total])
    totalRow.eachCell(cell => {
      cell.fill = TOTAL_FILL
      cell.font = HEADER_FONT
      cell.border = THIN_BORDER
    })
    totalRow.getCell(4).alignment = { horizontal: 'right' }
    totalRow.getCell(4).numFmt = '#,##0.00'
  }

  const dateStr = new Date().toISOString().split('T')[0]!
  const buffer = await wb.xlsx.writeBuffer()
  const filename = `transferencia-${t.socio.nombre.replace(/\s+/g, '-').toLowerCase()}-${periodoStr.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
