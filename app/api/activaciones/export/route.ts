import { requireApiAuth } from '@/lib/auth'
import { getActivacionesFilters, serializeActivacion } from '@/lib/read-models'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function fmtDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function escHtml(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if ('error' in auth) return auth.error

  const params = new URL(request.url).searchParams
  const { hasFilter, where } = getActivacionesFilters(params)

  if (!hasFilter) {
    return Response.json({ error: 'Se requiere al menos un filtro' }, { status: 400 })
  }

  const rows = await prisma.activacionImportada.findMany({
    where,
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { empresaNombreArchivo: 'asc' }, { creadaEn: 'asc' }],
    include: {
      empresa: {
        select: { id: true, nombre: true },
      },
    },
  })

  const data = rows.map((row) => serializeActivacion(row))

  const headerBg = '#1F3864'
  const altBg = '#EEF2FF'

  const columns = [
    'MID',
    'Chip',
    'Empresa',
    'Tipo de activación',
    'Lote',
    'Sub-lote',
    'Estado de activación',
    'Fecha de importación',
    'Fecha de activación',
    'Fecha de vencimiento',
    'Distribuidor',
    'Fecha asignación distribuidor',
  ]

  const colCount = columns.length

  const headerCells = columns
    .map(
      (col) =>
        `<th style="background:${headerBg};color:white;font-weight:bold;border:1px solid #ccc;padding:6px 10px">${escHtml(col)}</th>`,
    )
    .join('')

  const dataRows = data
    .map((row, i) => {
      const bg = i % 2 === 0 ? 'white' : altBg
      const cells = [
        row.mid,
        row.chip,
        row.empresa,
        row.tipoActivacion,
        row.lote,
        row.subLote,
        row.estadoActivacion,
        fmtDate(row.fechaImportacion),
        fmtDate(row.fechaActivacion),
        fmtDate(row.fechaVencimiento),
        row.distribuidor,
        fmtDate(row.fechaAsignacionDistribuidor),
      ]
        .map(
          (cell) =>
            `<td style="background:${bg};border:1px solid #ccc;padding:5px 10px">${escHtml(cell ?? '')}</td>`,
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const totalRow = `<tr><td colspan="${colCount}" style="background:#f1f5f9;border:1px solid #ccc;padding:6px 10px;font-weight:bold">Total: ${data.length} activaciones</td></tr>`

  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/></head>
<body>
<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">
<thead><tr>${headerCells}</tr></thead>
<tbody>${dataRows}${totalRow}</tbody>
</table>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': `attachment; filename="activaciones-${dateStr}.xls"`,
    },
  })
}
