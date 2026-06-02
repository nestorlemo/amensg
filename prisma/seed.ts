import { Prisma, PrismaClient } from '@prisma/client'

import { hashPassword } from '../lib/passwords'

const prisma = new PrismaClient()

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrador'
  const email = process.env.ADMIN_EMAIL || 'admin@amensg.local'
  const password = process.env.ADMIN_PASSWORD || 'change_me'
  const passwordHash = hashPassword(password)

  await prisma.usuario.upsert({
    where: { email },
    update: { nombre: name, passwordHash, rol: 'ADMIN', activo: true },
    create: { nombre: name, email, passwordHash, rol: 'ADMIN', activo: true },
  })

  for (const codigo of ['PENDIENTE', 'ENVIADO', 'PAGADO', 'CONTADO', 'CHEQUE', 'ANULADO']) {
    await prisma.estadoCobro.upsert({
      where: { codigo },
      update: {},
      create: { codigo, nombre: codigo },
    })
  }

  const parametros: Array<[string, Prisma.Decimal, string]> = [
    ['precio_unitario_activacion', new Prisma.Decimal('4.00'), 'Precio unitario de activación usado para futuras importaciones.'],
    ['porcentaje_iva', new Prisma.Decimal('0.22'), 'Porcentaje de IVA aplicado a futuras facturaciones.'],
  ]

  for (const [clave, valor, descripcion] of parametros) {
    await prisma.parametro.upsert({
      where: { clave },
      update: { valor, tipo: 'DECIMAL', descripcion, activo: true },
      create: { clave, valor, tipo: 'DECIMAL', descripcion, activo: true },
    })
  }

  await ensurePositiveParametro('tipo_cambio_usd', new Prisma.Decimal('40.00'), 'Tipo de cambio USD de referencia para futuras liquidaciones.')

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
    const existing = await prisma.gastoConcepto.findFirst({ where: { nombre } })
    if (existing) {
      await prisma.gastoConcepto.update({ where: { id: existing.id }, data: { tipo } })
    } else {
      await prisma.gastoConcepto.create({ data: { nombre, tipo } })
    }
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

async function ensurePositiveParametro(clave: string, fallback: Prisma.Decimal, descripcion: string) {
  const existing = await prisma.parametro.findUnique({
    where: { clave },
    select: { valor: true },
  })

  if (!existing) {
    await prisma.parametro.create({
      data: { clave, valor: fallback, tipo: 'DECIMAL', descripcion, activo: true },
    })
    return
  }

  await prisma.parametro.update({
    where: { clave },
    data: {
      valor: existing.valor.lessThanOrEqualTo(0) || existing.valor.equals(1) ? fallback : existing.valor,
      tipo: 'DECIMAL',
      descripcion,
      activo: true,
    },
  })
}

main().finally(async () => prisma.$disconnect())
