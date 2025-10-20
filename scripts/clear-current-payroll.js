const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearPayroll() {
  console.log('Clearing current payroll entries...')
  
  const settings = await prisma.attendanceSettings.findFirst()
  if (!settings) {
    console.log('No attendance settings found')
    await prisma.$disconnect()
    return
  }

  const deleted = await prisma.payrollEntry.deleteMany({
    where: {
      periodStart: settings.periodStart,
      periodEnd: settings.periodEnd
    }
  })

  console.log(`✅ Deleted ${deleted.count} payroll entries`)
  await prisma.$disconnect()
}

clearPayroll()
