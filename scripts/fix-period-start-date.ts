import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPeriodStartDate() {
  try {
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings) {
      console.log('No settings found')
      return
    }
    
    console.log('Current period:')
    console.log(`  Start: ${settings.periodStart?.toISOString()}`)
    console.log(`  End: ${settings.periodEnd?.toISOString()}`)
    console.log('')
    
    // Set to Nov 03, 2025 00:00:00 UTC (which is Nov 03, 2025 08:00 AM Philippine time)
    const newStart = new Date('2025-11-03T00:00:00.000Z')
    const newEnd = new Date('2025-11-05T23:59:59.999Z')
    
    await prisma.attendanceSettings.update({
      where: { attendance_settings_id: settings.attendance_settings_id },
      data: {
        periodStart: newStart,
        periodEnd: newEnd
      }
    })
    
    console.log('✅ Updated period to:')
    console.log(`  Start: ${newStart.toISOString()} (Nov 03, 2025)`)
    console.log(`  End: ${newEnd.toISOString()} (Nov 05, 2025)`)
    console.log('')
    console.log('💡 This will exclude Nov 02 from the payroll period')
    console.log('💡 Refresh your payroll page to see the updated calculations')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPeriodStartDate()
