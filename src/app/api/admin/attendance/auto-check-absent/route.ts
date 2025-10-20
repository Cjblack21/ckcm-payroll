import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"
import { getNowInPhilippines } from "@/lib/timezone"

/**
 * Auto-check and mark users as absent if past cut-off time
 * This runs periodically to check if current time is past the time-out cut-off
 * and automatically marks PENDING attendance as ABSENT
 */
export async function POST() {
  try {
    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings || !settings.autoMarkAbsent || !settings.timeOutEnd) {
      return NextResponse.json({ 
        success: false,
        message: 'Auto-mark absent is disabled or time-out end time is not configured.' 
      })
    }

    // Use Philippine timezone for all date calculations
    const nowPhilippines = getNowInPhilippines()
    const today = new Date(nowPhilippines)
    today.setHours(0, 0, 0, 0)
    
    // Parse cut-off time (timeOutEnd)
    const [cutoffHours, cutoffMinutes] = settings.timeOutEnd.split(':').map(Number)
    const cutoffTime = new Date(nowPhilippines)
    cutoffTime.setHours(cutoffHours, cutoffMinutes, 0, 0)
    
    console.log('🔍 Auto-check Debug:', {
      nowPhilippines: nowPhilippines.toISOString(),
      nowHours: nowPhilippines.getHours(),
      nowMinutes: nowPhilippines.getMinutes(),
      cutoffTime: cutoffTime.toISOString(),
      cutoffHours,
      cutoffMinutes,
      isPastCutoff: nowPhilippines >= cutoffTime
    })
    
    // Only proceed if current time is past cut-off time
    if (nowPhilippines < cutoffTime) {
      return NextResponse.json({ 
        success: true,
        message: 'Not yet past cut-off time',
        cutoffTime: cutoffTime.toISOString(),
        currentTime: nowPhilippines.toISOString()
      })
    }
    
    // Get start and end of today in UTC (for database query)
    // Since attendance dates are stored as midnight UTC, we need to query for the Philippine date
    const startOfToday = new Date(today)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(today)
    endOfToday.setHours(23, 59, 59, 999)

    // Get all active personnel users
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      select: { users_id: true, name: true, email: true }
    })

    // Get all existing attendance records for today
    const existingRecords = await prisma.attendance.findMany({
      where: { 
        date: { gte: startOfToday, lte: endOfToday } 
      },
      select: { users_id: true, status: true, date: true }
    })

    console.log('🔍 Debug - Date range:', {
      startOfToday: startOfToday.toISOString(),
      endOfToday: endOfToday.toISOString(),
      foundRecords: existingRecords.length,
      recordDates: existingRecords.map(r => ({ userId: r.users_id, status: r.status, date: r.date.toISOString() }))
    })

    const existingMap = new Map(existingRecords.map(r => [r.users_id, r.status]))
    
    // Find users who are PENDING or don't have a record yet
    const usersToMarkAbsent = activeUsers.filter(user => {
      const status = existingMap.get(user.users_id)
      return !status || status === 'PENDING'
    })

    let markedCount = 0

    for (const user of usersToMarkAbsent) {
      try {
        const existingStatus = existingMap.get(user.users_id)
        
        // Get user's personnel type and basic salary for deduction calculation
        const userData = await prisma.user.findUnique({
          where: { users_id: user.users_id },
          include: { personnelType: true }
        })
        
        const basicSalary = userData?.personnelType?.basicSalary || 0
        
        if (existingStatus === 'PENDING') {
          // Update existing PENDING record to ABSENT
          await prisma.attendance.updateMany({
            where: { 
              users_id: user.users_id,
              date: { gte: startOfToday, lte: endOfToday },
              status: 'PENDING'
            },
            data: { status: 'ABSENT' }
          })
          
          console.log(`✅ Marked ${user.name} as ABSENT (was PENDING)`)
          // Note: Absence deductions are now calculated in real-time by the payroll system
          // No database deduction records are created for attendance-related deductions
          
          markedCount++
        } else if (!existingStatus) {
          // Create new ABSENT record for users without any attendance today
          await prisma.attendance.create({
            data: {
              users_id: user.users_id,
              date: today,
              status: 'ABSENT'
            }
          })
          
          console.log(`✅ Created ABSENT record for ${user.name} (no attendance record)`)
          // Note: Absence deductions are now calculated in real-time by the payroll system
          // No database deduction records are created for attendance-related deductions
          
          markedCount++
        }
      } catch (error) {
        console.error(`Error marking user ${user.users_id} as absent:`, error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Auto-marked ${markedCount} users as absent after cut-off time (${settings.timeOutEnd})`,
      markedCount,
      cutoffTime: cutoffTime.toISOString(),
      currentTime: nowPhilippines.toISOString()
    })
  } catch (error) {
    console.error('Error in auto-check-absent:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to auto-check absent users' 
    }, { status: 500 })
  }
}
