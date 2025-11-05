/**
 * Script to fix today's ABSENT attendance records back to PENDING
 * Only runs if current time is BEFORE the cutoff time
 */

import { PrismaClient } from '@prisma/client'
import { getTodayRangeInPhilippines, getNowInPhilippines } from '../src/lib/timezone'

const prisma = new PrismaClient()

async function fixTodaysAbsentToPending() {
  try {
    console.log('🔧 Fixing today\'s premature ABSENT records...\n')
    
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
      console.log('✅ Current time is AFTER cutoff, no action needed')
      console.log('   (Records should legitimately be ABSENT after cutoff)')
      return
    }
    
    console.log('⚠️  Current time is BEFORE cutoff - fixing ABSENT records to PENDING...\n')
    
    // Get today's date range
    const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
    
    console.log(`📅 Today's date: ${startOfToday.toISOString().split('T')[0]}`)
    
    // Find all ABSENT records for today
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
      console.log('✅ No premature ABSENT records found for today')
      return
    }
    
    console.log(`⚠️  Found ${absentRecords.length} premature ABSENT record(s):`)
    for (const record of absentRecords) {
      console.log(`   - ${record.user.name} (${record.user.email})`)
    }
    console.log('')
    
    // Update all ABSENT records to PENDING
    const result = await prisma.attendance.updateMany({
      where: {
        status: 'ABSENT',
        date: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      data: {
        status: 'PENDING'
      }
    })
    
    console.log(`✅ Updated ${result.count} record(s) from ABSENT to PENDING`)
    console.log('✅ These will be automatically marked ABSENT after the cutoff time (9:10 AM)')
    console.log('\n💡 Refresh your payroll page to see the updated status')
    
    // Also remove any absence deductions created today
    const absenceType = await prisma.deductionType.findFirst({
      where: { name: 'Absence Deduction' }
    })
    
    if (absenceType) {
      const deductionResult = await prisma.deduction.deleteMany({
        where: {
          deduction_types_id: absenceType.deduction_types_id,
          appliedAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      })
      
      if (deductionResult.count > 0) {
        console.log(`✅ Also removed ${deductionResult.count} premature absence deduction(s)`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing ABSENT records:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTodaysAbsentToPending()
