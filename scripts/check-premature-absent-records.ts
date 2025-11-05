/**
 * Script to check for ABSENT attendance records created before cutoff time
 */

import { PrismaClient } from '@prisma/client'
import { getTodayRangeInPhilippines, getNowInPhilippines } from '../src/lib/timezone'

const prisma = new PrismaClient()

async function checkPrematureAbsentRecords() {
  try {
    console.log('🔍 Checking for premature ABSENT attendance records...')
    
    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    if (!settings || !settings.timeOutEnd) {
      console.log('❌ No attendance settings or timeOutEnd found')
      return
    }
    
    console.log(`✅ Cutoff time: ${settings.timeOutEnd}`)
    
    // Get current time in Philippines
    const nowPH = getNowInPhilippines()
    const nowHH = nowPH.getHours().toString().padStart(2, '0')
    const nowMM = nowPH.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    
    console.log(`⏰ Current time (PH): ${nowHHmm}`)
    
    // Check if we're before cutoff
    const isBeforeCutoff = nowHHmm <= settings.timeOutEnd
    
    if (!isBeforeCutoff) {
      console.log('✅ Current time is after cutoff, no action needed')
      return
    }
    
    console.log('\u26a0\ufe0f  Current time is BEFORE cutoff - checking for ABSENT records...')
    
    // Get today's date range
    const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
    
    console.log(`📅 Today's date range: ${startOfToday.toISOString()} to ${endOfToday.toISOString()}`)
    
    // Find ABSENT attendance records created TODAY
    const absentRecords = await prisma.attendance.findMany({
      where: {
        status: 'ABSENT',
        date: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    if (absentRecords.length === 0) {
      console.log('✅ No ABSENT attendance records found for today')
      return
    }
    
    console.log(`\u26a0\ufe0f  Found ${absentRecords.length} ABSENT attendance record(s) created before cutoff:`)
    
    for (const record of absentRecords) {
      console.log(`  - ${record.user.name} (${record.user.email})`)
      console.log(`    Date: ${record.date.toISOString()}`)
      console.log(`    Status: ${record.status}`)
      console.log(`    Time In: ${record.timeIn || 'null'}`)
      console.log(`    Time Out: ${record.timeOut || 'null'}`)
    }
    
    console.log('')
    console.log('💡 These records should be updated to PENDING until after the cutoff time.')
    console.log('💡 Run the fix script to update them: npx tsx scripts/fix-premature-absent-records.ts')
    
  } catch (error) {
    console.error('❌ Error checking premature ABSENT records:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPrematureAbsentRecords()
