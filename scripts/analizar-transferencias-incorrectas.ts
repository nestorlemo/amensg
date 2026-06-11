import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function mesNombre(m: number) { return MESES[m - 1] ?? String(m) }
function fmt(v: number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

// Derive anio/mes from a Transferencia:
// - New-flow transferencias (cobroId null, no cobrosCobro): parse concepto "... Mes YYYY"
// - Legacy transferencias: read from first linked cobro
function periodoFromConcepto(concepto: string): { anio: number; mes: number } | null {
  const match = concepto.match(/([A-Za-záéíóúÁÉÍÓÚ]+)\s+(\d{4})$/)
  if (!match) return null
  const mesIdx = MESES.findIndex(m => m.toLowerCase() === (match[1] ?? '').toLowerCase())
  if (mesIdx === -1) return null
  return { anio: parseInt(match[2]!), mes: mesIdx + 1 }
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

  type Row = {
    socio: string
    periodo: string
    moneda: string
    montoActual: number
    montoCorrecto: number | null
    diferencia: number | null
    necesitaCorreccion: boolean
    nota: string
  }

  const rows: Row[] = []

  for (const t of transferencias) {
    // Determine period
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

    const montoActual = Number(t.monto)
    const periodoLabel = anio && mes ? `${mesNombre(mes)} ${anio}` : '(sin período)'

    if (!anio || !mes) {
      rows.push({
        socio: t.socio.nombre,
        periodo: periodoLabel,
        moneda: t.moneda,
        montoActual,
        montoCorrecto: null,
        diferencia: null,
        necesitaCorreccion: false,
        nota: 'No se pudo determinar el período',
      })
      continue
    }

    // Find CierreSocio for this socio+period
    const cierreSocio = await prisma.cierreSocio.findFirst({
      where: {
        socioId: t.socioId,
        cierreMensual: { anio, mes },
      },
    })

    if (!cierreSocio) {
      rows.push({
        socio: t.socio.nombre,
        periodo: periodoLabel,
        moneda: t.moneda,
        montoActual,
        montoCorrecto: null,
        diferencia: null,
        necesitaCorreccion: false,
        nota: 'Sin CierreSocio para este período',
      })
      continue
    }

    const snap = cierreSocio.snapshot as Record<string, unknown>
    const montoCorrecto = t.moneda === 'UYU'
      ? (snap.montoPesos != null ? Number(snap.montoPesos) : null)
      : (snap.montoUsd   != null ? Number(snap.montoUsd)   : null)

    if (montoCorrecto === null) {
      rows.push({
        socio: t.socio.nombre,
        periodo: periodoLabel,
        moneda: t.moneda,
        montoActual,
        montoCorrecto: null,
        diferencia: null,
        necesitaCorreccion: false,
        nota: `snapshot.${t.moneda === 'UYU' ? 'montoPesos' : 'montoUsd'} es null`,
      })
      continue
    }

    const diferencia = montoActual - montoCorrecto
    const necesitaCorreccion = Math.abs(diferencia) >= 0.01

    rows.push({
      socio: t.socio.nombre,
      periodo: periodoLabel,
      moneda: t.moneda,
      montoActual,
      montoCorrecto,
      diferencia,
      necesitaCorreccion,
      nota: necesitaCorreccion ? '⚠ INCORRECTO' : '✓ correcto',
    })
  }

  // Print table
  const colW = [22, 18, 7, 16, 16, 14, 8, 30]
  const headers = ['Socio', 'Período', 'Moneda', 'Monto actual', 'Monto correcto', 'Diferencia', '¿Fix?', 'Nota']
  const sep = colW.map(w => '─'.repeat(w)).join('─┼─')

  function pad(s: string, w: number) { return s.length >= w ? s.slice(0, w - 1) + '…' : s.padEnd(w) }

  console.log('\n' + headers.map((h, i) => pad(h, colW[i]!)).join(' │ '))
  console.log(sep)

  for (const r of rows) {
    const cols = [
      r.socio,
      r.periodo,
      r.moneda,
      fmt(r.montoActual),
      r.montoCorrecto !== null ? fmt(r.montoCorrecto) : '—',
      r.diferencia   !== null ? fmt(r.diferencia)    : '—',
      r.necesitaCorreccion ? 'SÍ' : 'no',
      r.nota,
    ]
    console.log(cols.map((c, i) => pad(String(c), colW[i]!)).join(' │ '))
  }

  console.log(sep)
  const incorrectas = rows.filter(r => r.necesitaCorreccion)
  console.log(`\nTotal transferencias: ${rows.length}`)
  console.log(`Necesitan corrección: ${incorrectas.length}`)

  if (incorrectas.length > 0) {
    const totalDifUYU = incorrectas.filter(r => r.moneda === 'UYU').reduce((s, r) => s + (r.diferencia ?? 0), 0)
    const totalDifUSD = incorrectas.filter(r => r.moneda === 'USD').reduce((s, r) => s + (r.diferencia ?? 0), 0)
    if (Math.abs(totalDifUYU) >= 0.01) console.log(`Diferencia total UYU: ${fmt(totalDifUYU)}`)
    if (Math.abs(totalDifUSD) >= 0.01) console.log(`Diferencia total USD: ${fmt(totalDifUSD)}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
