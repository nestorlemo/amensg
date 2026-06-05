import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function fmt(date: Date | null): string {
  if (!date) return ''
  const d = date.toISOString().split('T')[0]!
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function num(v: unknown): string {
  return Number(v).toFixed(2)
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

  const where: Record<string, unknown> = {}
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

  const rows = issues.map((i, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#EEF2FF'
    return `
    <tr style="background:${bg}">
      <td>${fmt(i.fecha)}</td>
      <td>${escHtml(i.descripcion)}</td>
      <td>${escHtml(i.empresa?.nombre ?? '')}</td>
      <td>${escHtml((i as unknown as { sistema?: string | null }).sistema ?? '')}</td>
      <td style="text-align:right">${num(i.horasDesarrollo)}</td>
      <td style="text-align:right">${num(i.horasTest)}</td>
      <td style="text-align:right">${num(i.horasRework)}</td>
      <td style="text-align:right;font-weight:bold">${num(i.totalHoras)}</td>
      <td>${escHtml(i.estado.replace(/_/g, ' '))}</td>
      <td>${fmt(i.fechaProduccion)}</td>
      <td>${escHtml(i.reportadoPor)}</td>
      <td>${escHtml(i.prioridad)}</td>
    </tr>`
  }).join('')

  const dateStr = new Date().toISOString().split('T')[0]!
  const filename = `issues-${dateStr}.xls`

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #c8d0e0; padding: 5px 8px; }
  th { background: #1F3864; color: #fff; font-weight: bold; white-space: nowrap; }
  .totals td { background: #1F3864; color: #fff; font-weight: bold; }
</style>
</head>
<body>
<h2 style="color:#1F3864;margin-bottom:8px">Issues de desarrollo</h2>
<p style="color:#666;margin-bottom:12px;font-size:10pt">Exportado: ${fmt(new Date())} — ${issues.length} registros</p>
<table>
  <thead>
    <tr>
      <th>Fecha</th>
      <th>Descripción</th>
      <th>Empresa</th>
      <th>Sistema</th>
      <th>Hs. Desarrollo</th>
      <th>Hs. Test</th>
      <th>Hs. Rework</th>
      <th>Total Horas</th>
      <th>Estado</th>
      <th>Fecha Producción</th>
      <th>Reportado por</th>
      <th>Prioridad</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
  <tfoot>
    <tr class="totals">
      <td colspan="4">TOTAL (${issues.length} issues)</td>
      <td style="text-align:right">${totDev.toFixed(2)}</td>
      <td style="text-align:right">${totTest.toFixed(2)}</td>
      <td style="text-align:right">${totRework.toFixed(2)}</td>
      <td style="text-align:right">${totTotal.toFixed(2)}</td>
      <td colspan="4"></td>
    </tr>
    <tr class="totals">
      <td>TOTAL SIN IVA</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td style="mso-number-format:'\\@';text-align:right;font-weight:bold">USD ${new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totUSD)}</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tfoot>
</table>
</body></html>`

  return new Response(html, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.ms-excel; charset=UTF-8',
    },
  })
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
