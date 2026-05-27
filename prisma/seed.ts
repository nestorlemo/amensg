import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrador'
  const email = process.env.ADMIN_EMAIL || 'admin@amensg.local'
  const password = process.env.ADMIN_PASSWORD || 'change_me'

  await prisma.usuario.upsert({
    where: { email },
    update: { nombre: name },
    create: { nombre: name, email, passwordHash: password },
  })

  for (const codigo of ['PENDIENTE', 'ENVIADO', 'PAGADO', 'CONTADO', 'CHEQUE', 'ANULADO']) {
    await prisma.estadoCobro.upsert({
      where: { codigo },
      update: {},
      create: { codigo, nombre: codigo },
    })
  }

  const parametros: Array<[string, Prisma.Decimal]> = [
    ['precio_unitario_activacion', new Prisma.Decimal('4.00')],
    ['porcentaje_iva', new Prisma.Decimal('0.22')],
  ]

  for (const [clave, valor] of parametros) {
    await prisma.parametro.upsert({
      where: { clave },
      update: { valor },
      create: { clave, valor },
    })
  }

  await ensurePositiveParametro('tipo_cambio_usd', new Prisma.Decimal('40.00'))

  const socios: Array<[string, Prisma.Decimal]> = [
    ['Socio 1', new Prisma.Decimal('0.1200')],
    ['Socio 2', new Prisma.Decimal('0.4400')],
    ['Socio 3', new Prisma.Decimal('0.4400')],
  ]

  for (const [nombre, porcentajeParticipacion] of socios) {
    const existingSocio = await prisma.socio.findFirst({
      where: { nombre },
      select: { id: true },
    })

    if (existingSocio) {
      await prisma.socio.update({
        where: { id: existingSocio.id },
        data: { porcentajeParticipacion, activo: true },
      })
    } else {
      await prisma.socio.create({
        data: { nombre, porcentajeParticipacion, activo: true },
      })
    }
  }

  const conceptosGasto = [
    'Estudio contable',
    'IRAE',
    'AWS',
    'Compra de captchas',
    'Certificado AMENSG',
    'Facturación electrónica',
    'Otros',
  ].map((nombre) => [nombre, ['Estudio contable', 'AWS', 'Certificado AMENSG'].includes(nombre) ? 'FIJO' : 'VARIABLE'] as const)

  for (const [nombre, tipo] of conceptosGasto) {
    await prisma.gastoConcepto.upsert({
      where: { nombre },
      update: { tipo },
      create: { nombre, tipo },
    })
  }

  for (const nombre of ['VOS', 'RELPONT', 'Phinternet', 'Ciudad Móvil']) {
    const existingEmpresa = await prisma.empresa.findFirst({
      where: { nombre },
      select: { id: true },
    })

    if (!existingEmpresa) {
      await prisma.empresa.create({
        data: { nombre },
      })
    }
  }
}

async function ensurePositiveParametro(clave: string, fallback: Prisma.Decimal) {
  const existing = await prisma.parametro.findUnique({
    where: { clave },
    select: { valor: true },
  })

  if (!existing) {
    await prisma.parametro.create({
      data: { clave, valor: fallback },
    })
    return
  }

  if (existing.valor.lessThanOrEqualTo(0) || existing.valor.equals(1)) {
    await prisma.parametro.update({
      where: { clave },
      data: { valor: fallback },
    })
  }
}

main().finally(async () => prisma.$disconnect())
