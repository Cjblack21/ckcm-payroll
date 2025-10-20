const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAttendanceDate() {
  console.log('\n🔧 FIXING ATTENDANCE DATE\n')
  
  // Find the record with timeIn/timeOut on Oct 20 but date on Oct 19
  const records = await prisma.attendance.findMany({
    where: {
      date: {
        gte: new Date('2025-10-19T00:00:00.000Z'),
        lte: new Date('2025-10-20T23:59:59.999Z')
      },
      timeIn: { not: null }
    },
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  })

  console.log(`Found ${records.length} records with time in/out\n`)

  for (const record of records) {
    const timeInDate = record.timeIn ? new Date(record.timeIn).toISOString().split('T')[0] : null
    const storedDate = record.date.toISOString().split('T')[0]

    console.log('─'.repeat(80))
    console.log('User:', record.user.name)
    console.log('Stored Date:', storedDate)
    console.log('Time In Date:', timeInDate)
    console.log('Time In:', record.timeIn?.toISOString())
    console.log('Time Out:', record.timeOut?.toISOString())

    // If time in/out is on Oct 20 but record date is Oct 19, fix it
    if (timeInDate === '2025-10-20' && storedDate === '2025-10-19') {
      console.log('❌ MISMATCH DETECTED - Fixing...')
      
      // Update to Oct 20 00:00:00 UTC (Oct 20 08:00:00 Philippines)
      await prisma.attendance.update({
        where: { attendances_id: record.attendances_id },
        data: {
          date: new Date('2025-10-20T00:00:00.000Z')
        }
      })
      
      console.log('✅ Fixed! Updated date to 2025-10-20')
    } else if (storedDate === timeInDate) {
      console.log('✅ Date is correct')
    }
  }

  console.log('─'.repeat(80))
  console.log('\n✅ Done\n')

  await prisma.$disconnect()
}

fixAttendanceDate().catch(console.error)
