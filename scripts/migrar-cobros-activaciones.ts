/**
 * Migration script: create historical Cobro records for activaciones.
 *
 * Rules:
 * - Elared, Relpont, Phinternet → ONE Cobro per month grouping all their facturaciones,
 *   estado COBRADO for months before 2026-05, FACTURADO for 2026-05.
 * - VOS, Ciudad Móvil → one independent Cobro per empresa per month, estado COBRADO.
 * - Skip months where a Cobro with tipo=ACTIVACIONES already exists covering those facturaciones.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrar-cobros-activaciones.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const EMPRESAS_AGRUPADAS = ['Elared', 'Relpont', 'Phinternet']
const EMPRESAS_INDEPENDIENTES = ['VOS', 'Ciudad Móvil']
const CUTOFF = { anio: 2026, mes: 5 } // May 2026 → FACTURADO; before → COBRADO

function estadoForMonth(anio: number, mes: number): string {
  if (anio < CUTOFF.anio || (anio === CUTOFF.anio && mes < CUTOFF.mes)) return 'COBRADO'
  if (anio === CUTOFF.anio && mes === CUTOFF.mes) return 'FACTURADO'
  return 'FACTURADO'
}

async function main() {
  // Fetch all non-anulada facturaciones for our target companies
  const targetNames = [...EMPRESAS_AGRUPADAS, ...EMPRESAS_INDEPENDIENTES]

  const facturaciones = await prisma.facturacionMensual.findMany({
    where: {
      empresa: { nombre: { in: targetNames } },
      importacion: { estado: { not: 'ANULADA' } },
    },
    include: {
      empresa: { select: { id: true, nombre: true } },
    },
    orderBy: [{ anio: 'asc' }, { mes: 'asc' }, { empresa: { nombre: 'asc' } }],
  })

  // Find which facturaciones already have a CobroFacturacion
  const existingCF = await prisma.cobroFacturacion.findMany({
    where: { facturacionMensualId: { in: facturaciones.map((f) => f.id) } },
    select: { facturacionMensualId: true },
  })
  const alreadyCovered = new Set(existingCF.map((cf) => cf.facturacionMensualId))

  const pending = facturaciones.filter((f) => !alreadyCovered.has(f.id))
  console.log(`Total facturaciones: ${facturaciones.length}, already covered: ${alreadyCovered.size}, pending: ${pending.length}`)

  // Group by (anio, mes) for the grouped companies
  type MonthKey = string // `anio-mes`
  const agrupadas = new Map<MonthKey, typeof pending>()
  const independientes = new Map<string, typeof pending>() // `empresaId-anio-mes`

  for (const f of pending) {
    const nombre = f.empresa.nombre
    if (EMPRESAS_AGRUPADAS.includes(nombre)) {
      const key: MonthKey = `${f.anio}-${f.mes}`
      if (!agrupadas.has(key)) agrupadas.set(key, [])
      agrupadas.get(key)!.push(f)
    } else if (EMPRESAS_INDEPENDIENTES.includes(nombre)) {
      const key = `${f.empresaId}-${f.anio}-${f.mes}`
      if (!independientes.has(key)) independientes.set(key, [])
      independientes.get(key)!.push(f)
    }
  }

  console.log(`Grouped months (Elared/Relpont/Phinternet): ${agrupadas.size}`)
  console.log(`Independent (VOS/Ciudad Móvil): ${independientes.size}`)

  let created = 0

  // Create grouped cobros
  for (const [key, facts] of agrupadas.entries()) {
    const [anioStr, mesStr] = key.split('-')
    const anio = parseInt(anioStr!)
    const mes = parseInt(mesStr!)
    const estado = estadoForMonth(anio, mes)

    const totalSinIva = facts.reduce((s, f) => s.add(f.totalSinIva), new Prisma.Decimal(0))
    const totalIva    = facts.reduce((s, f) => s.add(f.iva),         new Prisma.Decimal(0))
    const totalConIva = facts.reduce((s, f) => s.add(f.totalConIva), new Prisma.Decimal(0))

    // Use first empresa (alphabetical by name, already sorted)
    const first = facts[0]!

    await prisma.$transaction(async (tx) => {
      const cobro = await tx.cobro.create({
        data: {
          tipo: 'ACTIVACIONES',
          empresaId: first.empresaId,
          anio,
          mes,
          montoSinIva: totalSinIva,
          iva: totalIva,
          montoConIva: totalConIva,
          moneda: 'UYU',
          estado,
          cobroFacturaciones: {
            create: facts.map((f) => ({ facturacionMensualId: f.id })),
          },
        },
      })
      console.log(`  [GROUPED] ${anio}-${String(mes).padStart(2,'0')} ${estado} — ${facts.length} facturaciones → cobro ${cobro.id}`)
    })
    created++
  }

  // Create independent cobros
  for (const [, facts] of independientes.entries()) {
    const first = facts[0]!
    const { anio, mes } = first
    const estado = 'COBRADO'

    const totalSinIva = facts.reduce((s, f) => s.add(f.totalSinIva), new Prisma.Decimal(0))
    const totalIva    = facts.reduce((s, f) => s.add(f.iva),         new Prisma.Decimal(0))
    const totalConIva = facts.reduce((s, f) => s.add(f.totalConIva), new Prisma.Decimal(0))

    await prisma.$transaction(async (tx) => {
      const cobro = await tx.cobro.create({
        data: {
          tipo: 'ACTIVACIONES',
          empresaId: first.empresaId,
          anio,
          mes,
          montoSinIva: totalSinIva,
          iva: totalIva,
          montoConIva: totalConIva,
          moneda: 'UYU',
          estado,
          cobroFacturaciones: {
            create: facts.map((f) => ({ facturacionMensualId: f.id })),
          },
        },
      })
      console.log(`  [INDEP]   ${first.empresa.nombre} ${anio}-${String(mes).padStart(2,'0')} ${estado} → cobro ${cobro.id}`)
    })
    created++
  }

  console.log(`\nDone. Created ${created} cobros.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
