/**
 * Copia Cobro.urlPdfFactura → FacturacionMensual.urlPdfFactura
 * para todos los cobros con PDF que tengan FacturacionMensual vinculada.
 *
 * Dry-run por defecto. Usar --apply para confirmar.
 */

import { prisma } from '../lib/prisma'

const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const cobros = await prisma.cobro.findMany({
    where: { urlPdfFactura: { not: null } },
    select: {
      id: true,
      urlPdfFactura: true,
      cobroFacturaciones: {
        select: {
          facturacionMensualId: true,
          facturacionMensual: { select: { id: true, urlPdfFactura: true } },
        },
      },
    },
  })

  console.log(`\nCobros con PDF: ${cobros.length}`)

  let updated = 0
  let skipped = 0

  for (const cobro of cobros) {
    if (cobro.cobroFacturaciones.length === 0) {
      console.log(`  SKIP (sin FM) cobro=${cobro.id}`)
      skipped++
      continue
    }

    for (const cf of cobro.cobroFacturaciones) {
      const fm = cf.facturacionMensual
      if (fm.urlPdfFactura === cobro.urlPdfFactura) {
        console.log(`  SKIP (ya actualizado) fm=${fm.id}`)
        skipped++
        continue
      }

      console.log(`  UPDATE fm=${fm.id} url=${cobro.urlPdfFactura}`)
      if (APPLY) {
        await prisma.facturacionMensual.update({
          where: { id: fm.id },
          data: { urlPdfFactura: cobro.urlPdfFactura },
        })
      }
      updated++
    }
  }

  console.log(`\nResumen: ${updated} actualizados, ${skipped} saltados`)
  if (!APPLY) console.log('Correr con --apply para confirmar los cambios.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
