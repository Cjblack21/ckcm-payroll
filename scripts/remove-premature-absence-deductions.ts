/**
 * Script to remove absence deductions that were created before the cutoff time
 * This fixes the bug where absence deductions were showing before 9:10 AM
 */

import { PrismaClient } from '@prisma/client'
import { getTodayRangeInPhilippines, getNowInPhilippines } from '../src/lib/timezone'

const prisma = new PrismaClient()

async function removePrematureAbsenceDeductions() {
  try {
    console.log('🔍 Starting removal of premature absence deductions...')
    
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
    
    console.log('⚠️  Current time is BEFORE cutoff - checking for premature deductions...')
    
    // Get today's date range
    const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
    
    console.log(`📅 Today's date range: ${startOfToday.toISOString()} to ${endOfToday.toISOString()}`)
    
    // Find absence deduction type
    const absenceType = await prisma.deductionType.findFirst({
      where: { name: 'Absence Deduction' }
    })
    
    if (!absenceType) {
      console.log('✅ No absence deduction type found in database')
      return
    }
    
    // Find all absence deductions created TODAY
    const todayAbsenceDeductions = await prisma.deduction.findMany({
      where: {
        deduction_types_id: absenceType.deduction_types_id,
        appliedAt: {
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
    
    if (todayAbsenceDeductions.length === 0) {
      console.log('✅ No absence deductions found for today')
      return
    }
    
    console.log(`\u26a0\ufe0f  Found ${todayAbsenceDeductions.length} absence deduction(s) created before cutoff:`)
    
    for (const deduction of todayAbsenceDeductions) {
      console.log(`  - ${deduction.user.name} (${deduction.user.email}): ₱${deduction.amount}`)
    }
    
    // Delete these premature deductions
    const result = await prisma.deduction.deleteMany({
      where: {
        deduction_types_id: absenceType.deduction_types_id,
        appliedAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    })
    
    console.log(`✅ Removed ${result.count} premature absence deduction(s)`)
    console.log('✅ These deductions will be recreated automatically after the cutoff time')
    
  } catch (error) {
    console.error('❌ Error removing premature absence deductions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removePrematureAbsenceDeductions()
