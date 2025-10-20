import { PrismaClient } from '@prisma/client'
import { getNowInPhilippines, toPhilippinesDateString } from '../src/lib/timezone'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Resetting today\'s attendance to PENDING...\n')
  
  try {
    const now = getNowInPhilippines()
    const todayString = toPhilippinesDateString(now)
    
    console.log('📅 Today (Philippines):', todayString)
    console.log('🕐 Current time:', now.toISOString())
    console.log('🕐 Current hour:', now.getHours(), 'minutes:', now.getMinutes())
    
    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings?.timeOutEnd) {
      console.log('❌ No time out end time configured')
      return
    }
    
    const [cutoffHours, cutoffMinutes] = settings.timeOutEnd.split(':').map(Number)
    const cutoffTime = new Date(now)
    cutoffTime.setHours(cutoffHours, cutoffMinutes, 0, 0)
    
    console.log('⏰ Cutoff time:', cutoffTime.toISOString())
    console.log('⏰ Is past cutoff?', now >= cutoffTime)
    
    // If we're before cutoff, update ABSENT records to PENDING
    if (now < cutoffTime) {
      // Parse today's date for database query
      const todayDate = new Date(todayString)
      todayDate.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayDate)
      todayEnd.setHours(23, 59, 59, 999)
      
      // Update all ABSENT records to PENDING
      const result = await prisma.attendance.updateMany({
        where: {
          date: {
            gte: todayDate,
            lte: todayEnd
          },
          status: 'ABSENT'
        },
        data: {
          status: 'PENDING'
        }
      })
      
      console.log(`\n✅ Updated ${result.count} attendance record(s) from ABSENT to PENDING`)
      console.log('✅ These will automatically be marked ABSENT after', settings.timeOutEnd)
    } else {
      console.log('\n⚠️ Current time is past cutoff - attendance records should be ABSENT')
      console.log('⚠️ No changes made')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
