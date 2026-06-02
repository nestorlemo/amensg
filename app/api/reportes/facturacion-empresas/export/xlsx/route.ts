import * as XLSX from 'xlsx'

import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const IVA_RATE = 0.22
const NUM_FMT = '#,##0.00'

// Colors
const DARK_BLUE = '1F3864'
const MID_BLUE  = '2E75B6'
const LIGHT_BG  = 'D9E1F2'
const ALT_BG    = 'EEF2FF'
const WHITE     = 'FFFFFF'

type CellStyle = {
  font?: { bold?: boolean; sz?: number; color?: { rgb: string } }
  fill?: { fgColor: { rgb: string }; patternType: 'solid' }
  alignment?: { horizontal?: 'center' | 'left' | 'right'; vertical?: 'center' }
  numFmt?: string
}

function cell(v: string | number, s: CellStyle): XLSX.CellObject {
  return { v, t: typeof v === 'number' ? 'n' : 's', s } as XLSX.CellObject
}

function bgStyle(rgb: string, extra: CellStyle = {}): CellStyle {
  return {
    fill: { fgColor: { rgb }, patternType: 'solid' },
    ...extra,
  }
}

function headerStyle(bgRgb: string): CellStyle {
  return {
    font: { bold: true, sz: 11, color: { rgb: WHITE } },
    fill: { fgColor: { rgb: bgRgb }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
  }
}

function titleStyle(): CellStyle {
  return {
    font: { bold: true, sz: 12, color: { rgb: WHITE } },
    fill: { fgColor: { rgb: DARK_BLUE }, patternType: 'solid' },
    alignment: { vertical: 'center' },
  }
}

function totalStyle(): CellStyle {
  return {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: LIGHT_BG }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: NUM_FMT,
  }
}

function numStyle(bgRgb?: string): CellStyle {
  return {
    fill: bgRgb ? { fgColor: { rgb: bgRgb }, patternType: 'solid' } : undefined as never,
    alignment: { horizontal: 'right' },
    numFmt: NUM_FMT,
  }
}

function setCell(ws: XLSX.WorkSheet, r: number, c: number, obj: XLSX.CellObject) {
  const addr = XLSX.utils.encode_cell({ r, c })
  ws[addr] = obj
  const ref = ws['!ref']
  if (ref) {
    const range = XLSX.utils.decode_range(ref)
    if (r > range.e.r) range.e.r = r
    if (c > range.e.c) range.e.c = c
    ws['!ref'] = XLSX.utils.encode_range(range)
  } else {
    ws['!ref'] = XLSX.utils.encode_range({ s: { r, c }, e: { r, c } })
  }
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

  const wb = XLSX.utils.book_new()

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

    const ws: XLSX.WorkSheet = { '!ref': 'A1:F1' }

    // Row 1 — title: empresa / mes / año
    setCell(ws, 0, 0, cell(`Empresa: ${nombre}`, titleStyle()))
    setCell(ws, 0, 1, cell('', bgStyle(DARK_BLUE, { font: { color: { rgb: WHITE } } })))
    setCell(ws, 0, 2, cell(`Mes: ${mesLabel}`, titleStyle()))
    setCell(ws, 0, 3, cell('', bgStyle(DARK_BLUE, { font: { color: { rgb: WHITE } } })))
    setCell(ws, 0, 4, cell(`Año: ${anio}`, titleStyle()))
    setCell(ws, 0, 5, cell('', bgStyle(DARK_BLUE, { font: { color: { rgb: WHITE } } })))

    // Row 2 — empty
    for (let c = 0; c < 6; c++) setCell(ws, 1, c, cell('', {}))

    // Row 3 — "TOTALES DEL MES" merged A3:F3
    setCell(ws, 2, 0, cell('TOTALES DEL MES', headerStyle(DARK_BLUE)))
    for (let c = 1; c < 6; c++) setCell(ws, 2, c, cell('', bgStyle(DARK_BLUE)))

    // Row 4 — summary headers
    const summaryHeaders = ['Registros', '', 'Total S/IVA ($)', 'IVA ($)', 'Total C/IVA ($)', '']
    for (let c = 0; c < 6; c++) setCell(ws, 3, c, cell(summaryHeaders[c]!, headerStyle(MID_BLUE)))

    // Row 5 — summary totals
    setCell(ws, 4, 0, cell(totalRegistros, { ...totalStyle(), numFmt: undefined }))
    setCell(ws, 4, 1, cell('', bgStyle(LIGHT_BG)))
    setCell(ws, 4, 2, cell(totalSinIva, totalStyle()))
    setCell(ws, 4, 3, cell(iva,         totalStyle()))
    setCell(ws, 4, 4, cell(totalConIva, totalStyle()))
    setCell(ws, 4, 5, cell('', bgStyle(LIGHT_BG)))

    // Row 6 — empty
    for (let c = 0; c < 6; c++) setCell(ws, 5, c, cell('', {}))

    // Row 7 — detail headers
    const detailHeaders = ['Fecha', 'Tipo', 'Cantidad', 'Total S/IVA ($)', 'IVA ($)', 'Total C/IVA ($)']
    for (let c = 0; c < 6; c++) setCell(ws, 6, c, cell(detailHeaders[c]!, headerStyle(MID_BLUE)))

    // Data rows — alternating background
    detalle.forEach((d, i) => {
      const r   = 7 + i
      const bg  = i % 2 === 0 ? undefined : ALT_BG
      const nst = numStyle(bg)
      setCell(ws, r, 0, cell(d.fecha,        { fill: bg ? { fgColor: { rgb: bg }, patternType: 'solid' } : undefined as never, alignment: { horizontal: 'center' } }))
      setCell(ws, r, 1, cell('Activaciones', { fill: bg ? { fgColor: { rgb: bg }, patternType: 'solid' } : undefined as never }))
      setCell(ws, r, 2, cell(d.cantidad,     { ...nst, numFmt: undefined, alignment: { horizontal: 'center' } }))
      setCell(ws, r, 3, cell(d.totalSinIva,  nst))
      setCell(ws, r, 4, cell(d.iva,          nst))
      setCell(ws, r, 5, cell(d.totalConIva,  nst))
    })

    // Merges
    ws['!merges'] = [
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // TOTALES DEL MES
    ]

    // Column widths
    ws['!cols'] = [
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 16 },
    ]

    // Row heights
    ws['!rows'] = [{ hpt: 22 }, {}, { hpt: 20 }, { hpt: 18 }, { hpt: 18 }, {}, { hpt: 18 }]

    const sheetName = nombre.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  if (wb.SheetNames.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['Sin datos para el período']])
    XLSX.utils.book_append_sheet(wb, ws, 'Sin datos')
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
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
