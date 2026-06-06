import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const facturas = await prisma.facturaDesarrollo.findMany({
    where: { anio: 2026, mes: 4 },
    include: { distribuciones: true },
  })

  if (facturas.length === 0) {
    console.log('No facturas found for April 2026.')
    return
  }

  for (const f of facturas) {
    const totalUSD = Number(f.totalUSD)
    console.log(`Factura ${f.id}: totalUSD=${totalUSD}, distribuciones=${f.distribuciones.length}`)
    for (const d of f.distribuciones) {
      const porcentaje = Number(d.porcentaje)
      const montoUYU = Math.round(totalUSD * (porcentaje / 100) * 100) / 100
      console.log(`  Distribucion ${d.id}: porcentaje=${porcentaje}% old=${Number(d.montoUYU)} new=${montoUYU}`)
      await prisma.distribucionFactura.update({ where: { id: d.id }, data: { montoUYU } })
    }
  }

  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
