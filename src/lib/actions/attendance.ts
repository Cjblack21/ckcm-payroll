'use server'

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns"
import { calculateEarlyTimeoutDeduction } from "@/lib/attendance-calculations"
import { calculateLateDeductionSync, calculateAbsenceDeductionSync, calculatePartialDeduction, calculateEarnings as calculateEarningsSync } from "@/lib/attendance-calculations-sync"
import { AttendanceStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getTodayRangeInPhilippines, getNowInPhilippines, getPhilippinesTimeString } from "@/lib/timezone"

// Types
export type AttendanceRecord = {
  attendances_id: string
  users_id: string
  date: Date | string
  timeIn: Date | string | null
  timeOut: Date | string | null
  status: AttendanceStatus
  user: {
    users_id: string
    name: string | null
    email: string
    personnelType?: {
      name: string
      basicSalary: number
    }
  }
  workHours: number
  earnings: number
  deductions: number
}

export type PersonnelAttendance = {
  users_id: string
  name: string | null
  email: string
  personnelType?: {
    name: string
    basicSalary: number
  }
  totalDays: number
  presentDays: number
  absentDays: number
  totalHours: number
  totalEarnings: number
  totalDeductions: number
}

// Helper function to check if user is within time window
function isWithinWindow(nowHHmm: string, start?: string | null, end?: string | null): boolean {
  if (!start || !end) return true
  return start <= nowHHmm && nowHHmm <= end
}

// Server Action: Punch attendance (time-in/time-out)
export async function punchAttendance(): Promise<{
  success: boolean
  message: string
  status?: AttendanceStatus
  earlyTimeoutDeduction?: {
    minutes: number
    amount: number
  } | null
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { success: false, message: '', error: 'Unauthorized' }
    }

    const users_id = session.user.id
    const now = new Date()
    const today = startOfDay(now)
    const todayEnd = endOfDay(now)
    
    console.log('🔍 DEBUG - Attendance Punch Request:')
    // Use timezone library to extract proper Philippines time  
    console.log('Current time:', getPhilippinesTimeString(now))

    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    console.log('Settings:', { 
      timeInStart: settings?.timeInStart, 
      timeInEnd: settings?.timeInEnd, 
      noTimeInCutoff: settings?.noTimeInCutoff 
    })

    // Check if there's an existing attendance record for today
    let record = await prisma.attendance.findFirst({
      where: {
        users_id,
        date: {
          gte: today,
          lte: todayEnd
        }
      }
    })

    let lateDeduction = 0
    let lateSeconds = 0
    let earlyTimeoutDeduction = 0
    let earlySeconds = 0

    if (!record) {
      // No record exists - this is a time-in
      // Use timezone library to extract proper Philippines time
      const nowHHmm = getPhilippinesTimeString(now)
      
      console.log('🕐 Time-in phase validation:')
      console.log('Time comparison:', nowHHmm, '(' + (now.getHours() * 60 + now.getMinutes()) + ' min) vs', settings?.timeInStart, '(' + (settings?.timeInStart ? parseInt(settings.timeInStart.split(':')[0]) * 60 + parseInt(settings.timeInStart.split(':')[1]) : 'N/A') + ' min) to', settings?.timeInEnd, '(' + (settings?.timeInEnd ? parseInt(settings.timeInEnd.split(':')[0]) * 60 + parseInt(settings.timeInEnd.split(':')[1]) : 'N/A') + ' min)')
      
      let status: AttendanceStatus = 'PRESENT'
      
      if (settings?.timeInStart && settings?.timeInEnd) {
        const isInNormalWindow = isWithinWindow(nowHHmm, settings.timeInStart, settings.timeInEnd)
        console.log('Normal window:', nowHHmm, '>=', settings.timeInStart, 'AND', nowHHmm, '<=', settings.timeInEnd, '=', isInNormalWindow)
        
        if (isInNormalWindow) {
          console.log('✅ ON-TIME: Within preferred time window')
          status = 'PRESENT'
        } else if (nowHHmm > settings.timeInEnd) {
          console.log('⏰ LATE: Past time-in end window')
          status = 'LATE'
        } else {
          console.log('✅ ON-TIME: Before time-in start (early arrival)')
          status = 'PRESENT'
        }
      }
      
      console.log('✅ Time-in validation passed - allowing late time-ins')
      
      // Calculate late deduction if applicable
      if (status === 'LATE') {
        console.log(`🔍 DEBUG: Late deduction calculation for user ${users_id}:`)
        console.log('🔍 DEBUG: Current time:', now.toISOString())
        
        if (settings?.timeInEnd) {
          // Get user's basic salary for calculation
          const userWithSalary = await prisma.user.findUnique({
            where: { users_id },
            include: { personnelType: true }
          })
          
          if (userWithSalary?.personnelType?.basicSalary) {
            const basicSalary = Number(userWithSalary.personnelType.basicSalary)
            const expectedTimeIn = new Date(now)
          const [hours, minutes] = settings.timeInEnd.split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
          const expectedMinutes = minutes + 1
          if (expectedMinutes >= 60) {
            expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
          } else {
            expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
          }
            
            console.log('🔍 DEBUG: Expected time:', expectedTimeIn.toISOString())
            console.log('🔍 DEBUG: Basic salary:', basicSalary)
            
            lateSeconds = Math.max(0, (now.getTime() - expectedTimeIn.getTime()) / 1000)
            const perSecondRate = basicSalary / 22 / 8 / 60 / 60
            lateDeduction = lateSeconds * perSecondRate
            
            console.log('🔍 DEBUG: Late seconds:', lateSeconds)
            console.log('🔍 DEBUG: Per-second rate: ₱' + perSecondRate.toFixed(6))
            console.log('🔍 DEBUG: Late deduction amount:', lateDeduction)
          }
        }
      }
      
      console.log('🔍 DEBUG: Status:', status)
      console.log('🔍 DEBUG: No late deduction created for user ' + users_id + ' - lateDeduction = ' + lateDeduction)

      // Normalize date to start of day to ensure consistency with existing records
      const normalizedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      
      record = await prisma.attendance.create({
        data: {
          users_id,
          date: normalizedDate,
          timeIn: now,
          status,
        },
      })
      
      // Late deduction calculated real-time from attendance record
      // No need to store separate deduction records
      if (lateDeduction > 0) {
        console.log(`🔍 DEBUG: Real-time late deduction calculated for user ${users_id}`)
        console.log(`🔍 DEBUG: lateDeduction = ${lateDeduction}, lateSeconds = ${lateSeconds}`)
        console.log(`✅ Real-time late deduction: ${lateDeduction} for user ${users_id} (${lateSeconds} seconds late)`)
      } else {
        console.log(`🔍 DEBUG: No late deduction for user ${users_id} - lateDeduction = ${lateDeduction}`)
      }
    } else if (!record.timeOut) {
      // Time-out - check for early time-out deduction
      
      if (settings?.timeOutStart) {
        // Get user's basic salary for calculation
        const userWithSalary = await prisma.user.findUnique({
          where: { users_id },
          include: { personnelType: true }
        })
        
        if (userWithSalary?.personnelType?.basicSalary) {
          const basicSalary = Number(userWithSalary.personnelType.basicSalary)
          earlyTimeoutDeduction = await calculateEarlyTimeoutDeduction(basicSalary, now, settings.timeOutStart)
          earlySeconds = Math.max(0, (new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
            parseInt(settings.timeOutStart.split(':')[0]), parseInt(settings.timeOutStart.split(':')[1]), 0, 0).getTime() - now.getTime()) / 1000)
        }
      }
      
      record = await prisma.attendance.update({
        where: { attendances_id: record.attendances_id },
        data: { timeOut: now },
      })
      
      // Early timeout deduction calculated real-time from attendance record
      // No need to store separate deduction records
      if (earlyTimeoutDeduction > 0) {
        console.log(`🔍 DEBUG: Real-time early timeout deduction calculated for user ${users_id}`)
        console.log(`🔍 DEBUG: earlyTimeoutDeduction = ${earlyTimeoutDeduction}, earlySeconds = ${earlySeconds}`)
        console.log(`✅ Real-time early timeout deduction: ${earlyTimeoutDeduction} for user ${users_id} (${Math.floor(earlySeconds / 60)} minutes early)`)
      } else {
        console.log(`🔍 DEBUG: No early timeout deduction for user ${users_id} - earlyTimeoutDeduction = ${earlyTimeoutDeduction}`)
      }
    } else {
      return { success: false, message: '', error: 'Already timed in and out today' }
    }

    // Revalidate attendance pages
    revalidatePath('/admin/attendance')
    revalidatePath('/attendance-portal')

    return { 
      success: true, 
      message: record.timeOut ? 'Time-out recorded successfully' : 'Time-in recorded successfully',
      status: record.status,
      earlyTimeoutDeduction: earlyTimeoutDeduction > 0 ? {
        minutes: Math.floor(earlySeconds / 60),
        amount: earlyTimeoutDeduction
      } : null
    }
  } catch (error) {
    console.error('Error in punchAttendance:', error)
    return { success: false, message: '', error: 'Failed to record attendance' }
  }
}

// Server Action: Get current day attendance
export async function getCurrentDayAttendance(): Promise<{
  success: boolean
  attendance?: AttendanceRecord[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const { start: today, end: todayEnd, now } = getTodayRangeInPhilippines()
    console.log(`🔍 DEEP DEBUG - System UTC: ${new Date().toISOString()}`)
    console.log(`🔍 DEEP DEBUG - Philippines Time: ${now.toISOString()}`)
    console.log(`🔍 DEEP DEBUG - Processing Date: ${today.toISOString().split('T')[0]}`)
    console.log(`🔍 DEEP DEBUG - Expected Date: ${now.toISOString().split('T')[0]}`)
    console.log(`🔍 DEEP DEBUG - Query Start: ${today.toISOString()}`)
    console.log(`🔍 DEEP DEBUG - Query End: ${todayEnd.toISOString()}`)
    
    // Check if dates match
    const expectedDate = now.toISOString().split('T')[0]
    const processingDate = today.toISOString().split('T')[0]
    const datesMatch = expectedDate === processingDate
    console.log(`🔍 TIMEZONE FIX RESULT - Dates Match: ${datesMatch} (Expected: ${expectedDate}, Processing: ${processingDate})`)

    // Get all personnel users
    const allPersonnelUsers = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      include: {
        personnelType: {
          select: {
            name: true,
            basicSalary: true
          }
        }
      }
    })

    // Get attendance settings FIRST (needed for period check)
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '09:00'
    
    // Get attendance records for today
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lte: todayEnd
        }
      },
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      }
    })
    
    // IMPORTANT: Check if system was just reset (no attendance records at all in the period)
    const totalAttendanceInPeriod = await prisma.attendance.count({
      where: attendanceSettings?.periodStart && attendanceSettings?.periodEnd ? {
        date: {
          gte: new Date(attendanceSettings.periodStart),
          lte: new Date(attendanceSettings.periodEnd)
        }
      } : {}
    })
    const isSystemJustReset = totalAttendanceInPeriod === 0
    console.log(`🔍 System Status - Total attendance records in period: ${totalAttendanceInPeriod}, Fresh reset: ${isSystemJustReset}`)
    
    console.log(`🔍 Current Day Debug - Found ${todayAttendance.length} existing records for ${today.toISOString().split('T')[0]}`)
    
    // Debug: Show actual dates of found records
    if (todayAttendance.length > 0) {
      const recordDates = todayAttendance.map(r => r.date.toISOString().split('T')[0])
      console.log(`🔍 Current Day Debug - Actual record dates: ${recordDates.join(', ')}`)
    }

    // Calculate working days in current period
    let workingDaysInPeriod = 22 // Default fallback
    if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
      const startDate = new Date(attendanceSettings.periodStart)
      const endDate = new Date(attendanceSettings.periodEnd)
      let days = 0
      const current = new Date(startDate)
      while (current <= endDate) {
        if (current.getDay() !== 0) { // Exclude Sundays
          days++
        }
        current.setDate(current.getDate() + 1)
      }
      workingDaysInPeriod = days
    }

    // Create a map for quick lookup
    const attendanceMap = new Map(todayAttendance.map(att => [att.users_id, att]))

    // Process all personnel users
    const attendanceData = await Promise.all(allPersonnelUsers.map(async (user) => {
      const attendanceRecord = attendanceMap.get(user.users_id)
      const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
      const monthlySalary = basicSalary

      let workHours = 0
      let earnings = 0
      let deductions = 0
      let status: AttendanceStatus

      if (attendanceRecord) {
        console.log(`🚨 EXISTING RECORD DEBUG - User: ${user.name}`)
        console.log(`🚨 EXISTING RECORD DEBUG - Has timeIn: ${!!attendanceRecord.timeIn}`)
        console.log(`🚨 EXISTING RECORD DEBUG - Has timeOut: ${!!attendanceRecord.timeOut}`)
        console.log(`🚨 EXISTING RECORD DEBUG - TimeIn value: ${attendanceRecord.timeIn}`)
        console.log(`🚨 EXISTING RECORD DEBUG - TimeOut value: ${attendanceRecord.timeOut}`)
        
        // RECALCULATE STATUS based on actual time-in and current settings
        if (attendanceRecord.timeIn) {
          const timeIn = new Date(attendanceRecord.timeIn)
          const expectedTimeIn = new Date(attendanceRecord.date)
          const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
          const expectedMinutes = minutes + 1
          if (expectedMinutes >= 60) {
            expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
          } else {
            expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
          }
          
          // Check if user was late
          if (timeIn > expectedTimeIn) {
            status = 'LATE'
          } else {
            status = 'PRESENT'
          }
          
          // Check for partial attendance if time-out is missing
          if (!attendanceRecord.timeOut) {
            const currentPhilTime = getNowInPhilippines()
            const currentTime = currentPhilTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
            const timeOutEnd = attendanceSettings?.timeOutEnd
            
            // If it's past time-out end and no time-out recorded, mark as partial
            if (timeOutEnd && currentTime > timeOutEnd) {
              status = 'PARTIAL'
            } else {
              // Still within time-out window, keep current status (PRESENT or LATE)
            }
          }
        } else {
          // No time-in recorded - check if this is a past date or current date
          const currentPhilTime = getNowInPhilippines()
          const attendanceDate = new Date(attendanceRecord.date)
          const todayDate = new Date(currentPhilTime.toISOString().split('T')[0])
          
          console.log(`🚨 NO TIME-IN DEBUG - User: ${user.name}`)
          console.log(`🚨 NO TIME-IN DEBUG - Attendance Date: ${attendanceDate.toISOString().split('T')[0]}`)
          console.log(`🚨 NO TIME-IN DEBUG - Today Date: ${todayDate.toISOString().split('T')[0]}`)
          console.log(`🚨 NO TIME-IN DEBUG - Is Past Date: ${attendanceDate < todayDate}`)
          
          if (attendanceDate < todayDate) {
            // Past date with no time-in - automatically ABSENT
            status = 'ABSENT'
            console.log(`🚨 NO TIME-IN DEBUG - Past date with no time-in = ABSENT`)
          } else if (attendanceDate.getTime() === todayDate.getTime()) {
            // Current date - check if we're past the TIME OUT END (final cutoff)
            const currentTime = getPhilippinesTimeString(currentPhilTime)
            const timeOutEnd = attendanceSettings?.timeOutEnd || '19:00' // Default 7:00 PM
            
            console.log(`🚨 NO TIME-IN DEBUG - Current Time: ${currentTime}`)
            console.log(`🚨 NO TIME-IN DEBUG - Time Out End (Cutoff): ${timeOutEnd}`)
            console.log(`🚨 NO TIME-IN DEBUG - Past Cutoff: ${currentTime > timeOutEnd}`)
            
            if (currentTime > timeOutEnd) {
              // Past cutoff time with no time-in - mark as ABSENT
              status = 'ABSENT'
              console.log(`🚨 NO TIME-IN DEBUG - Past cutoff (${timeOutEnd}) with no time-in = ABSENT`)
            } else {
              // Still before cutoff - remain PENDING (user can still time in)
              status = 'PENDING'
              console.log(`🚨 NO TIME-IN DEBUG - Before cutoff (${timeOutEnd}), no time-in = PENDING (can still time in)`)
            }
          } else {
            // Future date - should be PENDING
            status = 'PENDING'
            console.log(`🚨 NO TIME-IN DEBUG - Future date with no time-in = PENDING`)
          }
        }

        if (attendanceRecord.timeIn && attendanceRecord.timeOut) {
          // Complete attendance
          const timeIn = new Date(attendanceRecord.timeIn)
          const timeOut = new Date(attendanceRecord.timeOut)
          workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
          earnings = calculateEarningsSync(monthlySalary, timeIn, timeOut)
        } else if (attendanceRecord.timeIn && !attendanceRecord.timeOut) {
          // Incomplete attendance (only time-in)
          const timeIn = new Date(attendanceRecord.timeIn)
          const now = getNowInPhilippines()
          workHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
          earnings = calculateEarningsSync(monthlySalary, timeIn, now)
        }

        // Calculate deductions based on RECALCULATED status
        // IMPORTANT: If system was just reset, don't charge any deductions
        if (isSystemJustReset) {
          deductions = 0
          console.log(`⚠️ Current Day Debug - User: ${user.name}, System just reset - NO deductions`)
        } else if (status === 'LATE' && attendanceRecord.timeIn) {
          const timeIn = new Date(attendanceRecord.timeIn)
          const expectedTimeIn = new Date(attendanceRecord.date)
          const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
          const expectedMinutes = minutes + 1
          if (expectedMinutes >= 60) {
            expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
          } else {
            expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
          }
          
          console.log(`🔍 DEDUCTION DEBUG - User: ${user.name}`)
          console.log(`🔍 DEDUCTION DEBUG - TimeInEnd: ${attendanceSettings?.timeInEnd}`)
          console.log(`🔍 DEDUCTION DEBUG - Expected Time: ${expectedTimeIn.toISOString()}`)
          console.log(`🔍 DEDUCTION DEBUG - TimeIn: ${attendanceRecord.timeIn?.toISOString()}`)
          console.log(`🔍 DEDUCTION DEBUG - Monthly Salary: ${monthlySalary}`)
          console.log(`🔍 DEDUCTION DEBUG - Period Working Days: ${workingDaysInPeriod}`)
          console.log(`🔍 DEDUCTION DEBUG - Using Period Working Days: ${workingDaysInPeriod} (for per-second rate)`)
          
          // Use period-based working days for per-second rate calculation
          deductions = calculateLateDeductionSync(monthlySalary, timeIn, expectedTimeIn, workingDaysInPeriod)
          console.log(`🔍 Current Day Debug - User: ${user.name}, Status: LATE, Deduction: ${deductions}`)
        } else if (status === 'ABSENT' && !isSystemJustReset) {
          deductions = calculateAbsenceDeductionSync(monthlySalary, workingDaysInPeriod)
          console.log(`🔍 Current Day Debug - User: ${user.name}, Status: ABSENT, Deduction: ${deductions}`)
        } else if (status === 'PARTIAL') {
          deductions = calculatePartialDeduction(monthlySalary, workHours, 8, workingDaysInPeriod)
          console.log(`🔍 Current Day Debug - User: ${user.name}, Status: PARTIAL, Deduction: ${deductions}`)
        } else if (status === 'PENDING') {
          deductions = 0
          console.log(`🔍 Current Day Debug - User: ${user.name}, Status: PENDING, Deduction: ${deductions}`)
        }
      } else {
        // No attendance record at all - check current time vs cutoff time
        const now = getNowInPhilippines()
        // Use timezone library to extract proper Philippines time
        const currentTime = getPhilippinesTimeString(now)
        
        // IMPORTANT: Use TIME OUT END as the cutoff for marking absent
        // This is the final deadline - if no time-in by this time = ABSENT
        const timeOutEnd = attendanceSettings?.timeOutEnd || '19:00' // Default 7:00 PM
        
        console.log(`🚨 NO RECORD DEBUG - User: ${user.name}`)
        console.log(`🚨 NO RECORD DEBUG - Current Time: ${currentTime}`)
        console.log(`🚨 NO RECORD DEBUG - Time Out End (Cutoff): ${timeOutEnd}`)
        console.log(`🚨 NO RECORD DEBUG - Past Cutoff: ${currentTime > timeOutEnd}`)
        
        if (currentTime <= timeOutEnd) {
          // Still before cutoff time - mark as PENDING (user can still time in)
          status = 'PENDING'
          deductions = 0
          console.log(`🚨 NO RECORD DEBUG - SETTING STATUS: PENDING (before cutoff, can still time in)`)
        } else if (isSystemJustReset) {
          // System was just reset - don't charge deductions yet
          status = 'ABSENT'
          deductions = 0
          console.log(`⚠️ NO RECORD DEBUG - SETTING STATUS: ABSENT, but system just reset - NO deduction`)
        } else {
          // Past cutoff time (Time Out End) - mark as ABSENT with deduction
          status = 'ABSENT'
          deductions = calculateAbsenceDeductionSync(monthlySalary, workingDaysInPeriod)
          console.log(`🚨 NO RECORD DEBUG - SETTING STATUS: ABSENT (past cutoff time ${timeOutEnd})`)
        }
      }

      return {
        attendances_id: attendanceRecord?.attendances_id || `absent-${user.users_id}`,
        users_id: user.users_id,
        date: today.toISOString(),
        timeIn: attendanceRecord?.timeIn?.toISOString() || null,
        timeOut: attendanceRecord?.timeOut?.toISOString() || null,
        status,
        user: {
          users_id: user.users_id,
          name: user.name,
          email: user.email,
          personnelType: user.personnelType ? {
            ...user.personnelType,
            basicSalary: Number(user.personnelType.basicSalary)
          } : undefined
        },
        workHours,
        earnings,
        deductions
      }
    }))

    return { success: true, attendance: attendanceData }
  } catch (error) {
    console.error('Error in getCurrentDayAttendance:', error)
    return { success: false, error: 'Failed to fetch current day attendance' }
  }
}

// Server Action: Update Attendance Status
export async function updateAttendanceStatus(
  users_id: string,
  date: string,
  status: AttendanceStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Update the attendance status in the database
    await prisma.attendance.updateMany({
      where: {
        users_id: users_id,
        date: new Date(date)
      },
      data: {
        status: status
      }
    })

    console.log(`✅ Updated attendance status for user ${users_id} on ${date} to ${status}`)
    revalidatePath('/admin/attendance')
    
    return { success: true }
  } catch (error) {
    console.error('Error updating attendance status:', error)
    return { success: false, error: 'Failed to update attendance status' }
  }
}

// Server Action: Update All Attendance Status for a Date
export async function updateAllAttendanceStatusForDate(
  date: string,
  status: AttendanceStatus
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Update all attendance records for the specified date
    const result = await prisma.attendance.updateMany({
      where: {
        date: new Date(date)
      },
      data: {
        status: status
      }
    })

    console.log(`✅ Updated ${result.count} attendance records for ${date} to ${status}`)
    revalidatePath('/admin/attendance')
    
    return { success: true, updatedCount: result.count }
  } catch (error) {
    console.error('Error updating attendance status for date:', error)
    return { success: false, error: 'Failed to update attendance status for date' }
  }
}

// Server Action: Get personnel attendance summary
export async function getPersonnelAttendance(): Promise<{
  success: boolean
  personnel?: PersonnelAttendance[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    // Get all personnel users with their attendance data for current month up to today
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      include: {
        personnelType: {
          select: {
            name: true,
            basicSalary: true
          }
        },
        attendances: {
          where: {
            date: {
              gte: startOfCurrentMonth,
              lte: new Date() // Only up to today to match Attendance History
            }
          },
          orderBy: {
            date: 'asc'
          }
        }
      }
    })

    // Get attendance settings for proper time calculation
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '09:00'

    // Calculate working days in current period
    let workingDaysInPeriod = 22 // Default fallback
    if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
      const startDate = new Date(attendanceSettings.periodStart)
      const endDate = new Date(attendanceSettings.periodEnd)
      let days = 0
      const current = new Date(startDate)
      while (current <= endDate) {
        if (current.getDay() !== 0) { // Exclude Sundays
          days++
        }
        current.setDate(current.getDate() + 1)
      }
      workingDaysInPeriod = days
    }

    // Calculate personnel attendance summary
    const personnelData = users.map(user => {
      const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
      const monthlySalary = basicSalary
      
      
      let totalDays = 0
      let presentDays = 0
      let absentDays = 0
      let totalHours = 0
      let totalEarnings = 0
      let totalDeductions = 0

      // Calculate working days in current attendance period (excluding Sundays only)
      // IMPORTANT: Count the FULL period duration to show total working days in the period
      const today = new Date()
      const todayDateString = today.toISOString().split('T')[0]
      
      if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
        const currentDate = new Date(attendanceSettings.periodStart)
        const periodEnd = new Date(attendanceSettings.periodEnd)
        // Count the FULL period duration, not just up to today
        // This shows the total working days in the attendance period
        
        while (currentDate <= periodEnd) {
          const dayOfWeek = currentDate.getDay()
          if (dayOfWeek !== 0) { // Not Sunday (0) - include Saturdays and holidays as per requirements
            totalDays++
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      } else {
        // Fallback to current month calculation if no period set
        const currentDate = new Date(startOfCurrentMonth)
        const endDate = today < endOfCurrentMonth ? today : endOfCurrentMonth
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
            totalDays++
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      // Filter attendance records - use same logic as Attendance History (current month up to today)
      const periodAttendances = user.attendances.filter(attendance => {
        const attendanceDate = new Date(attendance.date)
        return attendanceDate >= startOfCurrentMonth && attendanceDate <= today
      })

      // Process attendance records with same logic as getPersonnelHistory
      periodAttendances.forEach(attendance => {
        let dayHours = 0
        let dayEarnings = 0
        let dayDeductions = 0
        
        // Calculate ACTUAL work hours for this day
        if (attendance.timeIn && attendance.timeOut) {
          const timeIn = new Date(attendance.timeIn)
          const timeOut = new Date(attendance.timeOut)
          dayHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        } else if (attendance.timeIn && !attendance.timeOut) {
          const timeIn = new Date(attendance.timeIn)
          const nowCalc = new Date()
          dayHours = (nowCalc.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        }
        
        totalHours += Math.max(0, dayHours)
        
        // RECALCULATE STATUS and deductions based on actual time-in and current settings (same as getPersonnelHistory)
        let calculatedStatus = attendance.status
        
        if (attendance.timeIn) {
          const timeIn = new Date(attendance.timeIn)
          const expectedTimeIn = new Date(attendance.date)
          const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
          const expectedMinutes = minutes + 1
          if (expectedMinutes >= 60) {
            expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
          } else {
            expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
          }
          
          // Check if user was late
          if (timeIn > expectedTimeIn) {
            calculatedStatus = 'LATE'
          } else {
            calculatedStatus = 'PRESENT'
          }
        }
        
        // Calculate earnings and deductions based on RECALCULATED status
        if (calculatedStatus === 'PRESENT') {
          presentDays++
          if (attendance.timeIn) {
            const timeIn = new Date(attendance.timeIn)
            const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
            dayEarnings = calculateEarningsSync(monthlySalary, timeIn, timeOut)
          }
          dayDeductions = 0
        } else if (calculatedStatus === 'LATE') {
          presentDays++
          if (attendance.timeIn) {
            const timeIn = new Date(attendance.timeIn)
            const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
            dayEarnings = calculateEarningsSync(monthlySalary, timeIn, timeOut)
            const expectedTimeIn = new Date(attendance.date)
            const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
            const expectedMinutes = minutes + 1
            if (expectedMinutes >= 60) {
              expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
            } else {
              expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
            }
            dayDeductions = calculateLateDeductionSync(monthlySalary, timeIn, expectedTimeIn, workingDaysInPeriod)
          }
        } else if (calculatedStatus === 'PENDING') {
          dayEarnings = 0
          dayDeductions = 0
        } else if (calculatedStatus === 'ABSENT') {
          // Explicitly marked absent day in the period
          absentDays++
          dayEarnings = 0
          dayDeductions = calculateAbsenceDeductionSync(monthlySalary, workingDaysInPeriod)
        } else if (calculatedStatus === 'PARTIAL') {
          presentDays++
          if (attendance.timeIn) {
            const timeIn = new Date(attendance.timeIn)
            const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
            dayEarnings = calculateEarningsSync(monthlySalary, timeIn, timeOut)
          }
          dayDeductions = calculatePartialDeduction(monthlySalary, dayHours)
        }
        
        totalDeductions += dayDeductions
        
        // For monthly metrics: only count current month
        if (attendance.date >= startOfCurrentMonth && attendance.date <= endOfCurrentMonth) {
          totalEarnings += dayEarnings
        }
      })


      // For CUMULATIVE deductions, we count deductions from:
      // 1. Actual attendance events (late arrivals, early departures, etc.)
      // 2. Absent days without attendance records (absence deductions)
      // This ensures all deductions are properly calculated

      console.log(`🔍 Personnel View Summary - User: ${user.name}, Present Days: ${presentDays}, Absent Days: ${absentDays}, Final Total Deductions: ₱${totalDeductions.toFixed(2)}`)

      return {
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        personnelType: user.personnelType ? {
          ...user.personnelType,
          basicSalary: Number(user.personnelType.basicSalary)
        } : undefined,
        totalDays,
        presentDays,
        absentDays,
        totalHours,
        totalEarnings,
        totalDeductions
      }
    })

    return { success: true, personnel: personnelData }
  } catch (error) {
    console.error('Error in getPersonnelAttendance:', error)
    return { success: false, error: 'Failed to fetch personnel attendance' }
  }
}

// Server Action: Get individual personnel attendance history
export async function getPersonnelHistory(userId: string): Promise<{
  success: boolean
  attendance?: AttendanceRecord[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    // Get user with personnel type
    const user = await prisma.user.findUnique({
      where: { users_id: userId },
      include: {
        personnelType: {
          select: {
            name: true,
            basicSalary: true
          }
        }
      }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Get attendance records for current period (not entire month)
    const { start: todayStart, end: todayEnd } = getTodayRangeInPhilippines()
    const currentDate = todayStart.toISOString().split('T')[0]
    
    // Only get records up to today, not future dates
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        users_id: userId,
        date: {
          gte: startOfCurrentMonth,
          lte: todayEnd // Only up to today, not future dates
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Get attendance settings for deduction calculations
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '09:00'

    // Calculate working days in current period
    let workingDaysInPeriod = 22 // Default fallback
    if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
      const startDate = new Date(attendanceSettings.periodStart)
      const endDate = new Date(attendanceSettings.periodEnd)
      let days = 0
      const current = new Date(startDate)
      while (current <= endDate) {
        if (current.getDay() !== 0) { // Exclude Sundays
          days++
        }
        current.setDate(current.getDate() + 1)
      }
      workingDaysInPeriod = days
    }

    const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0

    // IMPORTANT: Check if user has ANY attendance with actual time-in
    // If there are NO attendance records with time-in at all, don't charge deductions (likely just reset)
    const hasAnyAttendanceWithTimeIn = attendanceRecords.some(att => att.timeIn)
    
    console.log(`🔍 Personnel History Check - User: ${user.name}:`)
    console.log(`  - Total Records: ${attendanceRecords.length}`)
    console.log(`  - Has Time-In: ${hasAnyAttendanceWithTimeIn}`)
    console.log(`  - Decision: ${hasAnyAttendanceWithTimeIn ? 'Calculate deductions normally' : 'Skip ALL deductions (no real attendance yet)'}`)

    // Process attendance records and calculate DAILY deductions (not cumulative)
    const attendanceHistory = attendanceRecords
      .map(record => {
      let workHours = 0
      let earnings = 0
      let dailyDeductions = 0

      // Check if this is a future date (should be PENDING)
      const recordDate = new Date(record.date)
      const today = new Date()
      const todayDateString = today.toISOString().split('T')[0]
      const recordDateString = recordDate.toISOString().split('T')[0]
      const isFutureDate = recordDateString > todayDateString
      
      if (isFutureDate) {
        // Future dates should be PENDING with no deductions
        console.log(`🔍 Personnel History Debug - Future Date: ${recordDateString}, Status: PENDING, Deduction: ₱0.00`)
        return {
          attendances_id: record.attendances_id,
          users_id: record.users_id,
          date: record.date.toISOString(),
          timeIn: record.timeIn?.toISOString() || null,
          timeOut: record.timeOut?.toISOString() || null,
          status: 'PENDING' as AttendanceStatus,
          workHours: 0,
          earnings: 0,
          deductions: 0,
          user: {
            users_id: user.users_id,
            name: user.name,
            email: user.email,
            personnelType: user.personnelType ? {
              name: user.personnelType.name,
              basicSalary: Number(user.personnelType.basicSalary)
            } : undefined
          }
        }
      }
      
      // Check if this is a date with no time-in
      if (!record.timeIn) {
        // Determine if we should mark as ABSENT or PENDING
        let statusToShow: AttendanceStatus = 'PENDING'
        let dailyDeductions = 0
        
        // For past dates: check if we're past the FINAL cutoff time (Time Out End)
        if (recordDateString < todayDateString) {
          // Definitely past date - mark as ABSENT and charge deduction
          statusToShow = 'ABSENT'
          dailyDeductions = calculateAbsenceDeductionSync(basicSalary, workingDaysInPeriod)
          console.log(`🔍 Personnel History Debug - User: ${user.name}, Date: ${recordDateString}, Status: ABSENT (past date), Daily Deduction: ₱${dailyDeductions.toFixed(2)}`)
        } else if (recordDateString === todayDateString) {
          // Current date - check if we're past the cutoff time (Time Out End)
          const timeOutEnd = attendanceSettings?.timeOutEnd || '21:00' // Default 9:00 PM
          const currentPhilTime = getNowInPhilippines()
          const currentTime = getPhilippinesTimeString(currentPhilTime)
          
          console.log(`🔍 Personnel History Debug - User: ${user.name}, Current Date: ${recordDateString}, Current Time: ${currentTime}, Cutoff: ${timeOutEnd}`)
          
          if (currentTime > timeOutEnd) {
            // Past cutoff - mark as ABSENT and charge deduction
            statusToShow = 'ABSENT'
            dailyDeductions = calculateAbsenceDeductionSync(basicSalary, workingDaysInPeriod)
            console.log(`🔍 Personnel History Debug - User: ${user.name}, Date: ${recordDateString}, Status: ABSENT (past cutoff ${timeOutEnd}), Daily Deduction: ₱${dailyDeductions.toFixed(2)}`)
          } else {
            // Still before cutoff - keep as PENDING
            statusToShow = 'PENDING'
            console.log(`🔍 Personnel History Debug - User: ${user.name}, Date: ${recordDateString}, Status: PENDING (before cutoff ${timeOutEnd}), can still punch in`)
          }
        } else {
          // Future date - keep as PENDING
          statusToShow = 'PENDING'
          console.log(`🔍 Personnel History Debug - User: ${user.name}, Date: ${recordDateString}, Status: PENDING (future date)`)
        }
        
        return {
          attendances_id: record.attendances_id,
          users_id: record.users_id,
          date: record.date.toISOString(),
          timeIn: null,
          timeOut: null,
          status: statusToShow,
          user: {
            users_id: user.users_id,
            name: user.name,
            email: user.email,
            personnelType: user.personnelType ? {
              name: user.personnelType.name,
              basicSalary: Number(user.personnelType.basicSalary)
            } : undefined
          },
          workHours: 0,
          earnings: 0,
          deductions: dailyDeductions // DAILY deduction for this day only
        }
      }

      if (record.timeIn && record.timeOut) {
        const timeIn = new Date(record.timeIn)
        const timeOut = new Date(record.timeOut)
        workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        earnings = calculateEarningsSync(basicSalary, timeIn, timeOut)
      } else if (record.timeIn && !record.timeOut) {
        const timeIn = new Date(record.timeIn)
        const now = new Date()
        workHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        earnings = calculateEarningsSync(basicSalary, timeIn, now)
      }

      // RECALCULATE STATUS and deductions based on actual time-in and current settings
      let calculatedStatus = record.status
      
      if (record.timeIn) {
        const timeIn = new Date(record.timeIn)
        const expectedTimeIn = new Date(record.date)
        const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
        // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
        const expectedMinutes = minutes + 1
        if (expectedMinutes >= 60) {
          expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
        } else {
          expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
        }
        
        console.log(`🔍 Personnel History Debug - User: ${user.name}, Date: ${record.date.toISOString().split('T')[0]}, TimeIn: ${timeIn.toISOString()}, Expected: ${expectedTimeIn.toISOString()}`)
        
        // Check if user was late
        if (timeIn > expectedTimeIn) {
          calculatedStatus = 'LATE'
        } else {
          calculatedStatus = 'PRESENT'
        }
      }

      // Calculate DAILY deductions based on RECALCULATED status
      // IMPORTANT: Only calculate deductions if user has REAL attendance
      if (calculatedStatus === 'LATE' && record.timeIn && hasAnyAttendanceWithTimeIn) {
        const timeIn = new Date(record.timeIn)
        const expectedTimeIn = new Date(record.date)
        const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
        // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
        const expectedMinutes = minutes + 1
        if (expectedMinutes >= 60) {
          expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
        } else {
          expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
        }
        dailyDeductions = calculateLateDeductionSync(basicSalary, timeIn, expectedTimeIn, workingDaysInPeriod)
      } else if (calculatedStatus === 'ABSENT' && hasAnyAttendanceWithTimeIn) {
        dailyDeductions = calculateAbsenceDeductionSync(basicSalary, workingDaysInPeriod)
      } else if (calculatedStatus === 'PARTIAL' && hasAnyAttendanceWithTimeIn) {
        dailyDeductions = calculatePartialDeduction(basicSalary, workHours, 8, workingDaysInPeriod)
      }

      console.log(`🔍 Personnel History Debug - User: ${user.name}, Date: ${record.date.toISOString().split('T')[0]}, Status: ${calculatedStatus}, Daily Deduction: ₱${dailyDeductions.toFixed(2)}`)

      return {
        attendances_id: record.attendances_id,
        users_id: record.users_id,
        date: record.date.toISOString(),
        timeIn: record.timeIn?.toISOString() || null,
        timeOut: record.timeOut?.toISOString() || null,
        status: calculatedStatus,
        user: {
          users_id: user.users_id,
          name: user.name,
          email: user.email,
          personnelType: user.personnelType ? {
            name: user.personnelType.name,
            basicSalary: Number(user.personnelType.basicSalary)
          } : undefined
        },
        workHours,
        earnings,
        deductions: dailyDeductions // Return DAILY deductions for this day only
      }
    })
    .filter(record => {
      // Only show records that have ACTUAL data:
      // - Has time-in (PRESENT, LATE, or PARTIAL)
      // - OR is confirmed ABSENT (past cutoff time or past date)
      // Don't show PENDING records (no time-in and still before cutoff)
      return record.timeIn !== null || record.status === 'ABSENT'
    })

    return { success: true, attendance: attendanceHistory }
  } catch (error) {
    console.error('Error in getPersonnelHistory:', error)
    return { success: false, error: 'Failed to fetch personnel history' }
  }
}
