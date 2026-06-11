import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Find all FacturaDesarrollo that have a linked IngresoAdicional
  const facturas = await prisma.facturaDesarrollo.findMany({
    where: { ingresoAdicionalId: { not: null } },
  })

  const ingresoIds = facturas
    .map((f) => f.ingresoAdicionalId)
    .filter((id): id is string => id !== null)

  const ingresos = await prisma.ingresoAdicional.findMany({
    where: { id: { in: ingresoIds }, moneda: 'USD' },
    include: { empresa: { select: { nombre: true } } },
  })

  const ingresoMap = new Map(ingresos.map((i) => [i.id, i]))

  const toFix = facturas.filter(
    (f) => f.ingresoAdicionalId && ingresoMap.has(f.ingresoAdicionalId)
  )

  if (toFix.length === 0) {
    console.log('No hay registros a corregir.')
    return
  }

  console.log(`\nRegistros a corregir: ${toFix.length}\n`)
  console.log('─'.repeat(80))

  const IVA = 0.22

  for (const f of toFix) {
    const ia = ingresoMap.get(f.ingresoAdicionalId!)!
    const newMontoSinIva  = Number(f.totalUSD)
    const newIva          = Math.round(newMontoSinIva * IVA * 100) / 100
    const newMontoConIva  = Math.round(newMontoSinIva * (1 + IVA) * 100) / 100

    // Derive period from fechaHasta embedded in concepto
    // concepto format: "Desarrollo <empresa> <fechaDesde> / <fechaHasta>"
    const match = ia.concepto.match(/(\d{4}-\d{2}-\d{2})\s*$/)
    let newAnio = f.anio
    let newMes  = f.mes
    if (match) {
      const fechaHasta = new Date(match[1])
      newAnio = fechaHasta.getFullYear()
      newMes  = fechaHasta.getMonth() + 1
    }

    console.log(`IngresoAdicional ${ia.id}`)
    console.log(`  Empresa    : ${ia.empresa?.nombre ?? f.empresaId}`)
    console.log(`  Concepto   : ${ia.concepto}`)
    console.log(`  Período    : ${ia.anio}/${ia.mes} → ${newAnio}/${newMes}`)
    console.log(`  montoSinIva: ${ia.montoSinIva} → ${newMontoSinIva}`)
    console.log(`  iva        : ${ia.iva} → ${newIva}`)
    console.log(`  montoConIva: ${ia.montoConIva} → ${newMontoConIva}`)
    console.log('')
  }

  const apply = process.argv.includes('--apply')
  if (!apply) {
    console.log('─'.repeat(80))
    console.log('DRY RUN — ningún cambio aplicado.')
    console.log('Ejecutá con --apply para aplicar los cambios.')
    return
  }

  console.log('─'.repeat(80))
  console.log('Aplicando cambios...')

  await prisma.$transaction(async (tx) => {
    for (const f of toFix) {
      const ia = ingresoMap.get(f.ingresoAdicionalId!)!
      const newMontoSinIva = Number(f.totalUSD)
      const newIva         = Math.round(newMontoSinIva * IVA * 100) / 100
      const newMontoConIva = Math.round(newMontoSinIva * (1 + IVA) * 100) / 100

      const match = ia.concepto.match(/(\d{4}-\d{2}-\d{2})\s*$/)
      let newAnio = f.anio
      let newMes  = f.mes
      if (match) {
        const fechaHasta = new Date(match[1])
        newAnio = fechaHasta.getFullYear()
        newMes  = fechaHasta.getMonth() + 1
      }

      await tx.ingresoAdicional.update({
        where: { id: ia.id },
        data: {
          anio: newAnio,
          mes:  newMes,
          montoSinIva:  newMontoSinIva,
          iva:          newIva,
          montoConIva:  newMontoConIva,
        },
      })

      // Keep FacturaDesarrollo period in sync
      await tx.facturaDesarrollo.update({
        where: { id: f.id },
        data: { anio: newAnio, mes: newMes },
      })
    }
  })

  console.log(`✓ ${toFix.length} registros corregidos.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
