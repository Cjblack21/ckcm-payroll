import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listPersonnel() {
  const users = await prisma.user.findMany({
    where: { role: 'PERSONNEL', isActive: true },
    select: { name: true, email: true, users_id: true }
  })
  
  console.log('Personnel users:')
  users.forEach(u => console.log(`  - ${u.name} (${u.email})`))
  
  await prisma.$disconnect()
}

listPersonnel()
