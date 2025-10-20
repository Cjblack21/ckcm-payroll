const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAttendance() {
  console.log('\n📋 CHECKING TODAY\'S ATTENDANCE RECORDS\n')
  
  // Get all attendance records for the last 3 days to see what's there
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  
  const records = await prisma.attendance.findMany({
    where: {
      date: { gte: threeDaysAgo }
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: { date: 'desc' }
  })

  console.log(`Found ${records.length} attendance records in last 3 days:\n`)

  records.forEach(record => {
    console.log('─'.repeat(80))
    console.log('User:', record.user.name, `(${record.user.email})`)
    console.log('Date:', record.date.toISOString())
    console.log('Time In:', record.timeIn ? record.timeIn.toISOString() : 'NOT SET')
    console.log('Time Out:', record.timeOut ? record.timeOut.toISOString() : 'NOT SET')
    console.log('Status:', record.status)
  })

  console.log('─'.repeat(80))
  console.log('\n✅ Done\n')

  await prisma.$disconnect()
}

checkAttendance().catch(console.error)
