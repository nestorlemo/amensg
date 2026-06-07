import { PrismaClient, Prisma } from '@prisma/client'

const VALOR_HORA_USD = 45
const IVA = 0.22

const TIPO_CAMBIO: Record<string, number> = {
  '2025-01': 43.6873,
  '2025-02': 43.1168,
  '2025-03': 42.2712,
  '2025-04': 42.3042,
  '2025-05': 41.6820,
  '2025-06': 40.8541,
  '2025-07': 40.2457,
  '2025-08': 40.0432,
  '2025-09': 39.9695,
  '2025-10': 39.9235,
  '2025-11': 39.7242,
  '2025-12': 39.1485,
  '2026-01': 38.4391,
  '2026-02': 38.5670,
  '2026-03': 40.2286,
}

async function main() {
  const p = new PrismaClient()

  const socios = await p.socio.findMany({ where: { activo: true, nombre: { in: ['Néstor Lemo', 'Liber Batalla'] } } })
  console.log('Socios encontrados:', socios.map(s => s.nombre))
  if (socios.length !== 2) { console.error('No se encontraron exactamente 2 socios'); process.exit(1) }

  const issues = await p.issue.findMany({
    where: {
      estado: 'EN_PRODUCCION',
      fechaProduccion: { lte: new Date('2026-03-27') },
      facturaIssues: { none: {} }
    },
    include: { empresa: { select: { id: true, nombre: true } } },
    orderBy: { fechaProduccion: 'asc' }
  })
  console.log(`Issues a facturar: ${issues.length}`)

  // Agrupar por mes+empresa
  const grupos: Record<string, typeof issues> = {}
  for (const issue of issues) {
    const fp = issue.fechaProduccion!
    const key = `${fp.getFullYear()}-${String(fp.getMonth() + 1).padStart(2, '0')}_${issue.empresaId ?? 'sin_empresa'}`
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(issue)
  }

  console.log(`Grupos (mes+empresa): ${Object.keys(grupos).length}`)

  for (const [key, issuesGrupo] of Object.entries(grupos)) {
    const [mesKey, empresaId] = key.split('_') as [string, string]
    const tc = TIPO_CAMBIO[mesKey]
    if (!tc) { console.warn(`Sin tipo de cambio para ${mesKey}, saltando...`); continue }

    const totalHoras       = issuesGrupo.reduce((s, i) => s + Number(i.totalHoras), 0)
    const totalUSD         = Math.round(totalHoras * VALOR_HORA_USD * 100) / 100
    const totalUYU         = Math.round(totalUSD * tc * 100) / 100
    const ivaUYU           = Math.round(totalUYU * IVA * 100) / 100
    const totalConIvaUYU   = Math.round((totalUYU + ivaUYU) * 100) / 100

    const [anioStr, mesStr] = mesKey.split('-') as [string, string]
    const anio = parseInt(anioStr)
    const mes  = parseInt(mesStr)
    const empresaNombre = issuesGrupo[0].empresa?.nombre ?? 'Sin empresa'
    const realEmpresaId = empresaId !== 'sin_empresa' ? empresaId : issuesGrupo[0].empresaId!

    console.log(`\nCreando: ${mesKey} - ${empresaNombre} - ${totalHoras.toFixed(2)}h - $${totalUSD.toFixed(2)} USD - $${totalConIvaUYU.toFixed(2)} UYU c/IVA`)

    await p.$transaction(async (tx) => {
      // Crear IngresoAdicional primero (concepto es String, no FK)
      const concepto = `Desarrollo ${empresaNombre} ${mesKey}`
      const ingreso = await tx.ingresoAdicional.create({
        data: {
          concepto,
          empresaId:         realEmpresaId,
          anio,
          mes,
          moneda:            'USD',
          montoOrigen:       new Prisma.Decimal(totalUSD.toFixed(2)),
          fechaFacturacion:  new Date(`${anio}-${String(mes).padStart(2, '0')}-01`),
          tipoCambioAplicado: new Prisma.Decimal(tc.toFixed(4)),
          fuenteTipoCambio:  'MANUAL',
          fechaTipoCambio:   new Date(),
          montoSinIva:       new Prisma.Decimal(totalUYU.toFixed(2)),
          porcentajeIva:     new Prisma.Decimal(IVA),
          iva:               new Prisma.Decimal(ivaUYU.toFixed(2)),
          montoConIva:       new Prisma.Decimal(totalConIvaUYU.toFixed(2)),
        }
      })

      // Crear FacturaDesarrollo con ingresoAdicionalId
      // iva y totalConIva son en UYU (igual que el endpoint POST)
      const factura = await tx.facturaDesarrollo.create({
        data: {
          anio,
          mes,
          empresaId:         realEmpresaId,
          totalHoras:        new Prisma.Decimal(totalHoras.toFixed(2)),
          valorHoraUSD:      new Prisma.Decimal(VALOR_HORA_USD),
          totalUSD:          new Prisma.Decimal(totalUSD.toFixed(2)),
          tipoCambio:        new Prisma.Decimal(tc.toFixed(4)),
          totalUYU:          new Prisma.Decimal(totalUYU.toFixed(2)),
          iva:               new Prisma.Decimal(ivaUYU.toFixed(2)),
          totalConIva:       new Prisma.Decimal(totalConIvaUYU.toFixed(2)),
          ingresoAdicionalId: ingreso.id,
        }
      })

      // Vincular issues
      await tx.facturaIssue.createMany({
        data: issuesGrupo.map(i => ({ facturaId: factura.id, issueId: i.id }))
      })

      // Distribución 50/50
      for (const socio of socios) {
        await tx.distribucionFactura.create({
          data: {
            facturaId:  factura.id,
            socioId:    socio.id,
            porcentaje: new Prisma.Decimal(50),
            montoUYU:   new Prisma.Decimal((totalConIvaUYU * 0.5).toFixed(2)),
          }
        })
      }
    })
  }

  console.log('\n✅ Migración completada')
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
