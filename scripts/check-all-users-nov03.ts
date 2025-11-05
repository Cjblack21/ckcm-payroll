import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAllUsersNov03() {
  const users = await prisma.user.findMany({
    where: { role: 'PERSONNEL', isActive: true }
  })
  
  // Nov 03, 2025
  const targetDate = new Date('2025-11-03T00:00:00.000Z')
  const endDate = new Date('2025-11-03T23:59:59.999Z')
  
  console.log(`\n📅 Checking attendance for Nov 03, 2025\n`)
  
  for (const user of users) {
    const attendance = await prisma.attendance.findFirst({
      where: {
        users_id: user.users_id,
        date: { gte: targetDate, lte: endDate }
      }
    })
    
    if (attendance) {
      console.log(`${user.name} (${user.email}):`)
      console.log(`  Status: ${attendance.status}`)
      console.log(`  Time In: ${attendance.timeIn || 'null'}`)
      console.log(`  Time Out: ${attendance.timeOut || 'null'}`)
      console.log('')
    } else {
      console.log(`${user.name} (${user.email}): NO RECORD\n`)
    }
  }
  
  await prisma.$disconnect()
}

checkAllUsersNov03()
