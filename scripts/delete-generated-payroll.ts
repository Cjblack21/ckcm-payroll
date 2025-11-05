import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteGeneratedPayroll() {
  try {
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings || !settings.periodStart || !settings.periodEnd) {
      console.log('No settings found')
      return
    }
    
    console.log('Deleting generated payroll for period:')
    console.log(`  ${settings.periodStart.toISOString()} to ${settings.periodEnd.toISOString()}`)
    
    const result = await prisma.payrollEntry.deleteMany({
      where: {
        periodStart: settings.periodStart,
        periodEnd: settings.periodEnd
      }
    })
    
    console.log(`✅ Deleted ${result.count} generated payroll entries`)
    console.log('💡 Payroll will now calculate in real-time')
    console.log('💡 Refresh your payroll page to see live data')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteGeneratedPayroll()
