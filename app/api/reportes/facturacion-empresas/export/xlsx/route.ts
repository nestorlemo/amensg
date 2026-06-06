import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const IVA_RATE = 0.22

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

  const tablas: string[] = []

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

    const filaDetalle = detalle.map((d, i) => {
      const bg = i % 2 === 0 ? 'white' : '#EEF2FF'
      return `<tr style="background:${bg}">
        <td style="padding:4px 8px">${esc(d.fecha)}</td>
        <td style="padding:4px 8px">Activaciones</td>
        <td style="padding:4px 8px; text-align:center">${d.cantidad}</td>
        <td style="padding:4px 8px; text-align:right">${fmtNum(d.totalSinIva)}</td>
        <td style="padding:4px 8px; text-align:right">${fmtNum(d.iva)}</td>
        <td style="padding:4px 8px; text-align:right">${fmtNum(d.totalConIva)}</td>
      </tr>`
    }).join('\n')

    tablas.push(`
<div style="page-break-after:always">
<table style="border-collapse:collapse; font-family:Arial; width:100%">
  <tr>
    <td colspan="2" style="background:#1F3864;color:white;font-weight:bold;font-size:12pt;padding:6px">Empresa: ${esc(nombre)}</td>
    <td colspan="2" style="background:#1F3864;color:white;font-weight:bold;font-size:12pt;padding:6px;text-align:center">Mes: ${esc(mesLabel)}</td>
    <td colspan="2" style="background:#1F3864;color:white;font-weight:bold;font-size:12pt;padding:6px;text-align:right">Año: ${anio}</td>
  </tr>
  <tr><td colspan="6" style="height:10px"></td></tr>
  <tr>
    <td colspan="6" style="background:#1F3864;color:white;font-weight:bold;padding:6px">TOTALES DEL MES</td>
  </tr>
  <tr style="background:#2E75B6;color:white;font-weight:bold;text-align:center">
    <td style="padding:5px 8px">Registros</td>
    <td></td>
    <td style="padding:5px 8px">Total S/IVA ($)</td>
    <td style="padding:5px 8px">IVA ($)</td>
    <td colspan="2" style="padding:5px 8px">Total C/IVA ($)</td>
  </tr>
  <tr style="background:#D9E1F2;font-weight:bold;text-align:center">
    <td style="padding:5px 8px">${totalRegistros}</td>
    <td></td>
    <td style="padding:5px 8px">${fmtNum(totalSinIva)}</td>
    <td style="padding:5px 8px">${fmtNum(iva)}</td>
    <td colspan="2" style="padding:5px 8px">${fmtNum(totalConIva)}</td>
  </tr>
  <tr><td colspan="6" style="height:10px"></td></tr>
  <tr style="background:#2E75B6;color:white;font-weight:bold">
    <td style="padding:5px 8px">Fecha</td>
    <td style="padding:5px 8px">Tipo</td>
    <td style="padding:5px 8px;text-align:center">Cantidad</td>
    <td style="padding:5px 8px;text-align:right">Total S/IVA ($)</td>
    <td style="padding:5px 8px;text-align:right">IVA ($)</td>
    <td style="padding:5px 8px;text-align:right">Total C/IVA ($)</td>
  </tr>
  ${filaDetalle}
</table>
</div>`)
  }

  if (tablas.length === 0) {
    tablas.push('<p style="font-family:Arial">Sin datos para el período seleccionado.</p>')
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  td { border: 1px solid #ccc; }
</style>
</head>
<body>
${tablas.join('\n')}
</body>
</html>`

  const filename = `facturacion-${mesStr}-${anio}.xls`

  return new Response(html, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.ms-excel; charset=UTF-8',
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

function fmtNum(n: number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
