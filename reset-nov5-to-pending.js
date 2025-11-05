const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const nov5 = new Date('2025-11-05T00:00:00.000Z')
  const nov5End = new Date('2025-11-05T23:59:59.999Z')
  
  console.log('Resetting Nov 5 ABSENT records to PENDING...')
  
  const result = await prisma.attendance.updateMany({
    where: {
      date: { gte: nov5, lte: nov5End },
      status: 'ABSENT'
    },
    data: {
      status: 'PENDING'
    }
  })
  
  console.log(`Updated ${result.count} records to PENDING`)
  console.log('These will be auto-marked ABSENT after 4:00 PM cutoff')
  
  await prisma.$disconnect()
}

main()
