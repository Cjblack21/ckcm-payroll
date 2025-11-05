const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get current period from attendance settings
  const settings = await prisma.attendanceSettings.findFirst()
  
  if (!settings) {
    console.log('No attendance settings found')
    return
  }
  
  const periodStart = new Date(settings.periodStart)
  const periodEnd = new Date(settings.periodEnd)
  periodEnd.setHours(23, 59, 59, 999)
  
  console.log('Period:', periodStart.toISOString(), 'to', periodEnd.toISOString())
  console.log('')
  
  // Find Mike Johnson
  const mike = await prisma.user.findFirst({
    where: { name: { contains: 'Mike' } },
    include: {
      personnelType: {
        select: { basicSalary: true }
      }
    }
  })
  
  if (!mike) {
    console.log('Mike not found')
    return
  }
  
  console.log('User:', mike.name)
  console.log('Basic Salary:', mike.personnelType?.basicSalary)
  console.log('')
  
  // Get attendance records for current period
  const attendance = await prisma.attendance.findMany({
    where: {
      users_id: mike.users_id,
      date: { gte: periodStart, lte: periodEnd }
    },
    orderBy: { date: 'asc' }
  })
  
  console.log('=== ATTENDANCE RECORDS ===')
  attendance.forEach(a => {
    console.log(`Date: ${a.date.toISOString().split('T')[0]} - Status: ${a.status}`)
  })
  
  const absentCount = attendance.filter(a => a.status === 'ABSENT').length
  console.log('')
  console.log('Total ABSENT days:', absentCount)
  console.log('Expected deduction (1 day):', mike.personnelType?.basicSalary ? Number(mike.personnelType.basicSalary) / 22 : 0)
  console.log('Expected deduction (total):', mike.personnelType?.basicSalary ? (Number(mike.personnelType.basicSalary) / 22) * absentCount : 0)
  
  await prisma.$disconnect()
}

main()
