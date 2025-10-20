const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkRecord() {
  const record = await prisma.attendance.findFirst({
    where: {
      user: {
        email: 'jamesfebrio@ckcm.edu.ph'
      },
      date: {
        gte: new Date('2025-10-20T00:00:00.000Z'),
        lte: new Date('2025-10-20T23:59:59.999Z')
      }
    },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  })

  if (!record) {
    console.log('❌ No record found for Oct 20')
    await prisma.$disconnect()
    return
  }

  console.log('\n📋 ATTENDANCE RECORD DETAILS\n')
  console.log('User:', record.user.name)
  console.log('Date:', record.date.toISOString())
  console.log('Time In:', record.timeIn ? record.timeIn.toISOString() : 'NULL')
  console.log('Time Out:', record.timeOut ? record.timeOut.toISOString() : 'NULL')
  console.log('Status:', record.status)
  console.log('\n')

  await prisma.$disconnect()
}

checkRecord().catch(console.error)
