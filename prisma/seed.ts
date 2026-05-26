import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrador'
  const email = process.env.ADMIN_EMAIL || 'admin@amensg.local'
  const password = process.env.ADMIN_PASSWORD || 'change_me'

  await prisma.usuario.upsert({
    where: { email },
    update: { nombre: name },
    create: { nombre: name, email, passwordHash: password }
  })

  for (const codigo of ['PENDIENTE','ENVIADO','PAGADO','CONTADO','CHEQUE','ANULADO']) {
    await prisma.estadoCobro.upsert({ where: { codigo }, update: {}, create: { codigo, nombre: codigo } })
  }

  const parametros: Array<[string, Prisma.Decimal]> = [
    ['precio_unitario_activacion', new Prisma.Decimal(0)],
    ['porcentaje_iva', new Prisma.Decimal(22)],
    ['tipo_cambio_usd', new Prisma.Decimal(1)]
  ]
  for (const [clave, valor] of parametros) {
    await prisma.parametro.upsert({ where: { clave }, update: { valor }, create: { clave, valor } })
  }

  for (const nombre of ['Estudio contable','IRAE','AWS','Compra de captchas','Certificado AMENSG','Facturación electrónica','Otros']) {
    await prisma.gastoConcepto.upsert({ where: { nombre }, update: {}, create: { nombre } })
  }
}

main().finally(async () => prisma.$disconnect())
