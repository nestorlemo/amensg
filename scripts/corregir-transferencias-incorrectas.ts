import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function mesNombre(m: number) { return MESES[m - 1] ?? String(m) }
function fmt(v: number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function periodoFromConcepto(concepto: string): { anio: number; mes: number } | null {
  const match = concepto.match(/([A-Za-záéíóúÁÉÍÓÚ]+)\s+(\d{4})$/)
  if (!match) return null
  const mesIdx = MESES.findIndex(m => m.toLowerCase() === (match[1] ?? '').toLowerCase())
  if (mesIdx === -1) return null
  return { anio: parseInt(match[2]!), mes: mesIdx + 1 }
}

type Fix = {
  id: string
  socio: string
  periodo: string
  moneda: string
  montoActual: number
  montoCorrecto: number
  diferencia: number
}

async function main() {
  const transferencias = await prisma.transferencia.findMany({
    include: {
      socio: { select: { nombre: true } },
      cobrosCobro: {
        include: { cobro: { select: { anio: true, mes: true } } },
        take: 1,
        orderBy: { cobro: { anio: 'asc' } },
      },
    },
    orderBy: [{ socio: { nombre: 'asc' } }, { creadoEn: 'asc' }],
  })

  if (transferencias.length === 0) {
    console.log('No hay transferencias en la base de datos.')
    return
  }

  const fixes: Fix[] = []

  for (const t of transferencias) {
    let anio: number | null = null
    let mes: number | null = null

    if (t.cobrosCobro.length > 0) {
      const cobro = t.cobrosCobro[0]!.cobro
      anio = cobro.anio
      mes  = cobro.mes
    } else {
      const parsed = periodoFromConcepto(t.concepto)
      if (parsed) { anio = parsed.anio; mes = parsed.mes }
    }

    if (!anio || !mes) continue

    const cierreSocio = await prisma.cierreSocio.findFirst({
      where: {
        socioId: t.socioId,
        cierreMensual: { anio, mes },
      },
    })

    if (!cierreSocio) continue

    const snap = cierreSocio.snapshot as Record<string, unknown>
    const montoCorrecto = t.moneda === 'UYU'
      ? (snap.montoPesos != null ? Number(snap.montoPesos) : null)
      : (snap.montoUsd   != null ? Number(snap.montoUsd)   : null)

    if (montoCorrecto === null) continue

    const montoActual = Number(t.monto)
    const diferencia  = montoActual - montoCorrecto

    if (Math.abs(diferencia) < 0.01) continue

    fixes.push({
      id: t.id,
      socio: t.socio.nombre,
      periodo: `${mesNombre(mes)} ${anio}`,
      moneda: t.moneda,
      montoActual,
      montoCorrecto,
      diferencia,
    })
  }

  // ── Preview table ─────────────────────────────────────────────────────────

  const colW = [22, 18, 7, 16, 16, 14]
  const headers = ['Socio', 'Período', 'Moneda', 'Monto actual', 'Monto correcto', 'Diferencia']
  const sep = colW.map(w => '─'.repeat(w)).join('─┼─')
  function pad(s: string, w: number) { return s.length >= w ? s.slice(0, w - 1) + '…' : s.padEnd(w) }

  console.log('\n' + headers.map((h, i) => pad(h, colW[i]!)).join(' │ '))
  console.log(sep)

  for (const f of fixes) {
    const cols = [f.socio, f.periodo, f.moneda, fmt(f.montoActual), fmt(f.montoCorrecto), fmt(f.diferencia)]
    console.log(cols.map((c, i) => pad(String(c), colW[i]!)).join(' │ '))
  }

  console.log(sep)
  console.log(`\nTransferencias a corregir: ${fixes.length}`)

  if (fixes.length === 0) {
    console.log('No hay correcciones pendientes.')
    return
  }

  const totalDifUYU = fixes.filter(f => f.moneda === 'UYU').reduce((s, f) => s + f.diferencia, 0)
  const totalDifUSD = fixes.filter(f => f.moneda === 'USD').reduce((s, f) => s + f.diferencia, 0)
  if (Math.abs(totalDifUYU) >= 0.01) console.log(`Diferencia total UYU: ${fmt(totalDifUYU)}`)
  if (Math.abs(totalDifUSD) >= 0.01) console.log(`Diferencia total USD: ${fmt(totalDifUSD)}`)

  if (!APPLY) {
    console.log('\n⚠  Modo dry-run. Para aplicar los cambios, correr con --apply.')
    return
  }

  // ── Apply ─────────────────────────────────────────────────────────────────

  console.log('\nAplicando correcciones en una transacción…')

  await prisma.$transaction(
    fixes.map(f =>
      prisma.transferencia.update({
        where: { id: f.id },
        data:  { monto: f.montoCorrecto },
      }),
    ),
  )

  console.log(`✓ ${fixes.length} transferencia${fixes.length !== 1 ? 's' : ''} corregida${fixes.length !== 1 ? 's' : ''}.`)

  const corrUYU = fixes.filter(f => f.moneda === 'UYU').length
  const corrUSD = fixes.filter(f => f.moneda === 'USD').length
  if (corrUYU > 0) console.log(`  UYU: ${corrUYU} registro${corrUYU !== 1 ? 's' : ''}`)
  if (corrUSD > 0) console.log(`  USD: ${corrUSD} registro${corrUSD !== 1 ? 's' : ''}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
