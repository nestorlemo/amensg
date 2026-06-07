import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando migración de cobros...')

  // Migrate FacturacionMensual → Cobro ACTIVACIONES
  const facturaciones = await prisma.facturacionMensual.findMany({
    include: { estadoCobro: { select: { codigo: true } } },
  })

  let activacionesCount = 0
  for (const f of facturaciones) {
    const estado =
      f.estadoCobro.codigo === 'COBRADO' ? 'FACTURADO_COBRADO' : 'FACTURADO_PENDIENTE'
    await prisma.cobro.upsert({
      where: { id: f.id },  // won't match, just to use upsert pattern
      update: {},
      create: {
        tipo: 'ACTIVACIONES',
        empresaId: f.empresaId,
        anio: f.anio,
        mes: f.mes,
        montoSinIva: f.totalSinIva,
        iva: f.iva,
        montoConIva: f.totalConIva,
        moneda: 'UYU',
        estado,
        fechaCobro: f.fechaCobro ?? null,
      },
    })
    activacionesCount++
  }
  console.log(`  ACTIVACIONES migradas: ${activacionesCount}`)

  // Migrate FacturaDesarrollo → Cobro DESARROLLO
  const facturasDesarrollo = await prisma.facturaDesarrollo.findMany()

  let desarrolloCount = 0
  for (const fd of facturasDesarrollo) {
    const estado = fd.estado === 'COBRADO' ? 'FACTURADO_COBRADO' : 'FACTURADO_PENDIENTE'
      ? (Number(fd.totalConIva) / (1 + Number(fd.iva) / 100))
      : Number(fd.totalUYU)
    await prisma.cobro.create({
      data: {
        tipo: 'DESARROLLO',
        empresaId: fd.empresaId,
        anio: fd.anio,
        mes: fd.mes,
        montoSinIva: fd.totalUYU,
        iva: fd.iva,
        montoConIva: fd.totalConIva,
        moneda: 'UYU',
        estado,
        facturaDesarrolloId: fd.id,
      },
    })
    desarrolloCount++
  }
  console.log(`  DESARROLLO migradas: ${desarrolloCount}`)

  // Migrate IngresoAdicional → Cobro ADICIONAL
  const ingresos = await prisma.ingresoAdicional.findMany({
    where: { empresaId: { not: null } },
  })

  let adicionalCount = 0
  for (const ia of ingresos) {
    if (!ia.empresaId) continue
    await prisma.cobro.create({
      data: {
        tipo: 'ADICIONAL',
        empresaId: ia.empresaId,
        anio: ia.anio,
        mes: ia.mes,
        montoSinIva: ia.montoSinIva,
        iva: ia.iva,
        montoConIva: ia.montoConIva,
        moneda: ia.moneda,
        estado: 'FACTURADO_PENDIENTE',
        ingresoAdicionalId: ia.id,
      },
    })
    adicionalCount++
  }
  console.log(`  ADICIONAL migradas: ${adicionalCount}`)

  console.log('Migración completada.')
  console.log(`Total: ${activacionesCount + desarrolloCount + adicionalCount} cobros creados.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
