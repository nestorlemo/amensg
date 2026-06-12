/**
 * Para cada Cobro con urlPdfFactura != null y facturaId == null:
 *   - Crea una Factura con urlPdf = cobro.urlPdfFactura
 *   - Asigna cobro.facturaId = factura.id
 *
 * Dry-run por defecto. Usar --apply para confirmar.
 */

import { prisma } from '../lib/prisma'

const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const cobros = await prisma.cobro.findMany({
    where: {
      urlPdfFactura: { not: null },
      facturaId: null,
    },
    select: {
      id: true,
      tipo: true,
      anio: true,
      mes: true,
      urlPdfFactura: true,
      empresa: { select: { nombre: true } },
    },
  })

  console.log(`\nCobros con PDF sin Factura: ${cobros.length}`)

  for (const cobro of cobros) {
    console.log(`\n  Cobro ${cobro.id} (${cobro.tipo} ${cobro.anio}/${cobro.mes} - ${cobro.empresa.nombre})`)
    console.log(`    urlPdfFactura: ${cobro.urlPdfFactura}`)

    if (APPLY) {
      const factura = await prisma.factura.create({
        data: { urlPdf: cobro.urlPdfFactura },
      })
      await prisma.cobro.update({
        where: { id: cobro.id },
        data: { facturaId: factura.id },
      })
      console.log(`    → Factura creada: ${factura.id}`)
    } else {
      console.log(`    → [DRY] Crearía Factura con urlPdf=${cobro.urlPdfFactura} y asignaría facturaId`)
    }
  }

  console.log(`\nResumen: ${cobros.length} cobros procesados`)
  if (!APPLY) console.log('Correr con --apply para confirmar los cambios.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
