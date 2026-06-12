/**
 * Agrupa retroactivamente Cobros de Activaciones de las 4 empresas principales
 * (ELARED, RELPONT, Phinternet, VOS) en una Factura por período (anio/mes).
 *
 * Solo procesa Cobros con facturaId = null.
 * Dry-run por defecto. Usar --apply para confirmar.
 */

import { prisma } from '../lib/prisma'

const APPLY = process.argv.includes('--apply')

// Fragmentos a buscar (case-insensitive) en el nombre de empresa
const EMPRESAS_TARGET = ['elared', 'relpont', 'phinternet', 'vos']

function esEmpresaTarget(nombre: string): boolean {
  const lower = nombre.toLowerCase()
  return EMPRESAS_TARGET.some((t) => lower.includes(t))
}

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  // Listar empresas existentes para verificar nombres exactos
  const todasEmpresas = await prisma.empresa.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  })
  console.log('=== Empresas en la tabla Empresa ===')
  for (const e of todasEmpresas) {
    const tag = esEmpresaTarget(e.nombre) ? ' ← TARGET' : ''
    console.log(`  ${e.nombre}${tag}`)
  }
  console.log()

  const targetIds = new Set(todasEmpresas.filter((e) => esEmpresaTarget(e.nombre)).map((e) => e.id))

  // Cobros ACTIVACIONES sin facturaId
  const cobros = await prisma.cobro.findMany({
    where: {
      tipo: 'ACTIVACIONES',
      facturaId: null,
    },
    include: { empresa: { select: { id: true, nombre: true } } },
    orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
  })

  // Agrupar por período
  const byPeriodo = new Map<string, typeof cobros>()
  for (const c of cobros) {
    const key = `${c.anio}-${String(c.mes).padStart(2, '0')}`
    const g = byPeriodo.get(key) ?? []
    g.push(c)
    byPeriodo.set(key, g)
  }

  console.log(`=== Cobros ACTIVACIONES sin facturaId: ${cobros.length} en ${byPeriodo.size} período(s) ===\n`)

  // Tabla de resultados
  const rows: { periodo: string; empresas: string; cantidad: number; facturaId: string }[] = []

  let totalFacturas = 0

  for (const [periodo, grupo] of [...byPeriodo.entries()].sort()) {
    const targets = grupo.filter((c) => targetIds.has(c.empresaId))
    if (targets.length === 0) {
      console.log(`  ${periodo}: sin empresas target (${grupo.map((c) => c.empresa.nombre).join(', ')}) — saltado`)
      continue
    }

    const nombres = targets.map((c) => c.empresa.nombre).join(', ')
    let facturaId = '[DRY]'

    if (APPLY) {
      const factura = await prisma.factura.create({ data: {} })
      await prisma.cobro.updateMany({
        where: { id: { in: targets.map((c) => c.id) } },
        data: { facturaId: factura.id },
      })
      facturaId = factura.id
    }

    rows.push({ periodo, empresas: nombres, cantidad: targets.length, facturaId })
    totalFacturas++
  }

  // Tabla resumen
  console.log('\n=== Resultado ===')
  console.log(`${'Período'.padEnd(10)} | ${'Empresas'.padEnd(45)} | Cant | Factura ID`)
  console.log(`${'-'.repeat(10)}-+-${'-'.repeat(45)}-+------+${'-'.repeat(38)}`)
  for (const r of rows) {
    const emp = r.empresas.length > 45 ? r.empresas.slice(0, 42) + '...' : r.empresas.padEnd(45)
    console.log(`${r.periodo.padEnd(10)} | ${emp} | ${String(r.cantidad).padStart(4)} | ${r.facturaId}`)
  }
  console.log(`\nTotal Facturas ${APPLY ? 'creadas' : 'a crear'}: ${totalFacturas}`)

  if (!APPLY) console.log('\nCorrer con --apply para confirmar los cambios.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
