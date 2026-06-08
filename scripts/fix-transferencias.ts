import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.transferencia.count()
  console.log(`Eliminando ${count} transferencias existentes...`)
  await prisma.transferencia.deleteMany({})
  console.log('Listo.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
