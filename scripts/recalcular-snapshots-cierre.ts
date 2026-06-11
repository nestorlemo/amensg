/**
 * Recalcula el desglose por socio (montoActivaciones, montoDesarrolloUSD, montoDesarrolloUYU)
 * para cada CierreSocio existente que aún no tiene esos campos, usando los datos ya
 * guardados en CierreMensual.snapshot.
 *
 * Dry-run por defecto — pasar --apply para persistir cambios.
 *
 * Uso:
 *   npx ts-node scripts/recalcular-snapshots-cierre.ts
 *   npx ts-node scripts/recalcular-snapshots-cierre.ts --apply
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
function mesNombre(m: number) { return MESES[m - 1] ?? String(m) }

function fmt(v: number) {
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function parseNum(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

type DistribucionSnap = {
  socioNombre: string
  montoUSD:    string
  montoUYU:    string
}

type FacturaDesarrolloSnap = {
  distribuciones: DistribucionSnap[]
}

type SocioSnap = {
  socioId:         string
  socioNombre:     string
  socioPorcentaje: string
}

type CierreSnapshot = {
  totalGastos?: string
  ingresos?: {
    facturacionSinIva?:  string
    desarrolloFacturas?: FacturaDesarrolloSnap[]
  }
  socios?: SocioSnap[]
}

type Update = {
  cierreSocioId:      string
  socioNombre:        string
  periodo:            string
  oldMontoPesos:      number
  oldMontoUsd:        number | null
  existingSnapshot:   Record<string, unknown>
  montoActivaciones:  number
  montoDesarrolloUSD: number
  montoDesarrolloUYU: number
}

async function main() {
  const cierres = await prisma.cierreMensual.findMany({
    where:   { estado: 'CERRADO' },
    include: { cierresSocio: true },
    orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
  })

  if (cierres.length === 0) {
    console.log('No hay cierres en estado CERRADO.')
    return
  }

  const updates: Update[] = []

  for (const cierre of cierres) {
    const snap = (cierre.snapshot ?? {}) as CierreSnapshot
    const periodo = `${mesNombre(cierre.mes)} ${cierre.anio}`

    const facturacionSinIva = parseNum(snap.ingresos?.facturacionSinIva)
    const totalGastos       = parseNum(snap.totalGastos)
    const resultadoActivaciones = facturacionSinIva - totalGastos

    const desarrolloFacturas: FacturaDesarrolloSnap[] = snap.ingresos?.desarrolloFacturas ?? []
    const sociosSnap: SocioSnap[] = snap.socios ?? []

    for (const cs of cierre.cierresSocio) {
      const csSnap = (cs.snapshot ?? {}) as Record<string, unknown>

      // Skip if already has the new desglose fields
      if (csSnap.montoActivaciones !== undefined) continue

      const socioSnapEntry = sociosSnap.find(s => s.socioId === cs.socioId)
      if (!socioSnapEntry) {
        console.warn(`  ⚠ Socio ${cs.socioId} no encontrado en snapshot del cierre ${periodo}`)
        continue
      }

      const socioPorcentaje = parseNum(socioSnapEntry.socioPorcentaje)
      const montoActivaciones = Math.round(resultadoActivaciones * socioPorcentaje * 100) / 100

      let montoDesarrolloUSD = 0
      let montoDesarrolloUYU = 0

      for (const factura of desarrolloFacturas) {
        const dist = factura.distribuciones.find(d => d.socioNombre === socioSnapEntry.socioNombre)
        if (dist) {
          montoDesarrolloUSD += parseNum(dist.montoUSD)
          montoDesarrolloUYU += parseNum(dist.montoUYU)
        }
      }

      montoDesarrolloUSD = Math.round(montoDesarrolloUSD * 100) / 100
      montoDesarrolloUYU = Math.round(montoDesarrolloUYU * 100) / 100

      updates.push({
        cierreSocioId:      cs.id,
        socioNombre:        socioSnapEntry.socioNombre,
        periodo,
        oldMontoPesos:      parseNum(csSnap.montoPesos),
        oldMontoUsd:        csSnap.montoUsd != null ? parseNum(csSnap.montoUsd) : null,
        existingSnapshot:   csSnap,
        montoActivaciones,
        montoDesarrolloUSD,
        montoDesarrolloUYU,
      })
    }
  }

  if (updates.length === 0) {
    console.log('Todos los CierreSocio ya tienen el desglose actualizado.')
    return
  }

  // ── Preview table ──────────────────────────────────────────────────────────

  const colW = [22, 18, 16, 12, 16, 16, 16]
  const headers = ['Socio', 'Período', 'MontoPesos (ant)', 'MontoUsd (ant)', 'Activaciones', 'Desarr. USD', 'Desarr. UYU']
  const sep = colW.map(w => '─'.repeat(w)).join('─┼─')
  function pad(s: string, w: number) { return s.length >= w ? s.slice(0, w - 1) + '…' : s.padEnd(w) }

  console.log('\n' + headers.map((h, i) => pad(h, colW[i]!)).join(' │ '))
  console.log(sep)

  for (const u of updates) {
    const cols = [
      u.socioNombre,
      u.periodo,
      fmt(u.oldMontoPesos),
      u.oldMontoUsd !== null ? fmt(u.oldMontoUsd) : '—',
      fmt(u.montoActivaciones),
      fmt(u.montoDesarrolloUSD),
      fmt(u.montoDesarrolloUYU),
    ]
    console.log(cols.map((c, i) => pad(String(c), colW[i]!)).join(' │ '))
  }

  console.log(sep)
  console.log(`\nRegistros a actualizar: ${updates.length}`)

  if (!APPLY) {
    console.log('\n⚠  Modo dry-run. Para aplicar los cambios, correr con --apply.')
    return
  }

  // ── Apply (individual updates to merge JSON snapshot) ─────────────────────

  console.log('\nAplicando actualizaciones…')

  for (const u of updates) {
    await prisma.cierreSocio.update({
      where: { id: u.cierreSocioId },
      data: {
        snapshot: {
          ...u.existingSnapshot,
          montoActivaciones:  u.montoActivaciones.toFixed(2),
          montoDesarrolloUSD: u.montoDesarrolloUSD.toFixed(2),
          montoDesarrolloUYU: u.montoDesarrolloUYU.toFixed(2),
        },
      },
    })
  }

  console.log(`✓ ${updates.length} CierreSocio actualizados con el nuevo desglose.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
