import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStartOfDayInPhilippines, getEndOfDayInPhilippines, getNowInPhilippines } from "@/lib/timezone"
import { calculateLateDeduction, calculateEarlyTimeoutDeduction, createLateDeduction } from "@/lib/attendance-calculations"
import { AttendanceStatus } from "@prisma/client"

// Ensure this route is always dynamically rendered
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isWithinWindow(nowHHmm: string, start?: string | null, end?: string | null): boolean {
  if (!start || !end) return true
  return start <= nowHHmm && nowHHmm <= end
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inputUsersId = typeof body?.users_id === 'string' ? body.users_id : null
    const inputEmail = typeof body?.email === 'string' ? body.email : null

    if (!inputUsersId && !inputEmail) {
      return NextResponse.json({ error: 'users_id or email is required' }, { status: 400 })
    }

    // Resolve user either by users_id or email
    const user = inputUsersId
      ? await prisma.user.findUnique({ where: { users_id: inputUsersId } })
      : await prisma.user.findUnique({ where: { email: inputEmail! } })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    // Use resolved users_id for all subsequent operations
    const users_id = user.users_id

    // Check if user has approved leave for today
    const now = getNowInPhilippines()
    const startToday = getStartOfDayInPhilippines(now)
    const endToday = getEndOfDayInPhilippines(now)
    
    console.log('🔍 LEAVE CHECK DEBUG:')
    console.log('🔍 Current Philippines time:', now.toISOString())
    console.log('🔍 Start of today:', startToday.toISOString())
    console.log('🔍 End of today:', endToday.toISOString())
    
    // Method 1: Check for approved leave requests
    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        users_id,
        status: 'APPROVED',
        startDate: { lte: endToday },
        endDate: { gte: startToday }
      }
    })

    console.log('🔍 LEAVE CHECK RESULT:', approvedLeave ? {
      startDate: approvedLeave.startDate.toISOString(),
      endDate: approvedLeave.endDate.toISOString(),
      isPaid: approvedLeave.isPaid,
      status: approvedLeave.status,
      comparison: {
        'startDate <= endToday': `${approvedLeave.startDate.toISOString()} <= ${endToday.toISOString()} = ${approvedLeave.startDate <= endToday}`,
        'endDate >= startToday': `${approvedLeave.endDate.toISOString()} >= ${startToday.toISOString()} = ${approvedLeave.endDate >= startToday}`,
        'Today is within leave': approvedLeave.startDate <= endToday && approvedLeave.endDate >= startToday
      }
    } : 'No approved leave found')

    if (approvedLeave) {
      const leaveType = approvedLeave.isPaid ? 'paid' : 'unpaid'
      console.log(`⛔ BLOCKING ATTENDANCE: User is on ${leaveType} leave`)
      return NextResponse.json({ 
        error: `You are on approved ${leaveType} leave from ${new Date(approvedLeave.startDate).toLocaleDateString()} to ${new Date(approvedLeave.endDate).toLocaleDateString()}. Attendance cannot be recorded during leave.`,
        onLeave: true,
        leaveDetails: {
          type: leaveType,
          startDate: approvedLeave.startDate,
          endDate: approvedLeave.endDate
        }
      }, { status: 403 })
    }
    
    // Method 2: Check if today's attendance record already has ON_LEAVE status
    const existingAttendance = await prisma.attendance.findFirst({
      where: { 
        users_id, 
        date: { gte: startToday, lte: endToday },
        status: 'ON_LEAVE'
      },
    })
    
    if (existingAttendance) {
      console.log(`⛔ BLOCKING ATTENDANCE: Attendance record already marked as ON_LEAVE`)
      return NextResponse.json({ 
        error: 'You are on approved leave today. Attendance cannot be recorded during leave.',
        onLeave: true,
        leaveDetails: {
          type: 'leave',
          startDate: existingAttendance.date,
          endDate: existingAttendance.date
        }
      }, { status: 403 })
    }

    const settings = await prisma.attendanceSettings.findFirst()
    const nowHH = now.getHours().toString().padStart(2, '0')
    const nowMM = now.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    
    console.log('🔍 DEBUG - Attendance Punch Request:')
    console.log('Current time:', nowHHmm)
    console.log('Settings:', settings ? {
      timeInStart: settings.timeInStart,
      timeInEnd: settings.timeInEnd,
      noTimeInCutoff: settings.noTimeInCutoff
    } : 'No settings found')


    // Find or create today's record
    let record = await prisma.attendance.findFirst({
      where: { users_id, date: { gte: startToday, lte: endToday } },
    })

    // Decide punch direction
    const isTimeInPhase = !record || !record.timeIn

    // Validate cutoff only (allow late/early with deductions)
    if (settings && settings.timeOutEnd) {
      const currentMinutes = parseInt(nowHH) * 60 + parseInt(nowMM)
      const cutoffMinutes = parseInt(settings.timeOutEnd.split(':')[0]) * 60 + parseInt(settings.timeOutEnd.split(':')[1])
      const cutoffStart = settings.timeOutStart ? (parseInt(settings.timeOutStart.split(':')[0]) * 60 + parseInt(settings.timeOutStart.split(':')[1])) : null
      
      // Check if past cutoff (timeOutEnd)
      let afterCutoff = false
      if (cutoffStart !== null && cutoffStart > cutoffMinutes) {
        // Overnight cutoff window
        afterCutoff = currentMinutes > cutoffMinutes && currentMinutes < cutoffStart
      } else {
        // Normal same-day cutoff
        afterCutoff = currentMinutes > cutoffMinutes
      }
      
      if (afterCutoff) {
        console.log('⛔ Blocking punch: past daily cutoff (timeOutEnd)')
        return NextResponse.json({ error: 'Attendance not allowed after daily cutoff. You will be marked absent if no punches recorded.' }, { status: 400 })
      }
    }

    // Apply punch
    let lateDeduction = 0
    let lateSeconds = 0
    let earlyTimeoutDeduction = 0
    let earlySeconds = 0
    let status: AttendanceStatus = AttendanceStatus.PENDING
    
    if (!record) {
      // First punch (time-in) - determine status based on timing
      if (settings?.timeInEnd) {
        // Get user's basic salary for calculation
        const userWithSalary = await prisma.user.findUnique({
          where: { users_id },
          include: { personnelType: true }
        })
        
        if (userWithSalary?.personnelType?.basicSalary) {
          const basicSalary = Number(userWithSalary.personnelType.basicSalary)
          // Create expected time from settings using TODAY's date in Philippines timezone
          // Extract date components from the Philippines time
          const phTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
          const phDate = new Date(phTimeString)
          const year = phDate.getFullYear()
          const month = phDate.getMonth()
          const date = phDate.getDate()
          
          const [hours, minutes] = settings.timeInEnd.split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (05:31 AM instead of 05:30 AM)
          const expectedMinutes = minutes + 1
          const expectedHours = expectedMinutes >= 60 ? hours + 1 : hours
          const finalMinutes = expectedMinutes >= 60 ? expectedMinutes - 60 : expectedMinutes
          
          // Create expected time in Philippines timezone
          const expectedTime = new Date(year, month, date, expectedHours, finalMinutes, 0, 0)
          
          const lateDeductionAmount = await calculateLateDeduction(basicSalary, now, expectedTime)
          lateSeconds = Math.max(0, (now.getTime() - expectedTime.getTime()) / 1000)
          
          lateDeduction = lateDeductionAmount
          lateSeconds = Math.floor(lateSeconds)
          status = lateSeconds > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
          
          console.log(`🔍 DEBUG: Late deduction calculation for user ${users_id}:`)
          console.log(`🔍 DEBUG: Current time: ${now.toISOString()}`)
          console.log(`🔍 DEBUG: Expected time: ${expectedTime.toISOString()}`)
          console.log(`🔍 DEBUG: Basic salary: ${basicSalary}`)
          console.log(`🔍 DEBUG: Late seconds: ${lateSeconds}`)
          console.log(`🔍 DEBUG: Per-second rate: ₱${(basicSalary / 22 / 8 / 60 / 60).toFixed(6)}`)
          console.log(`🔍 DEBUG: Late deduction amount: ${lateDeductionAmount}`)
          console.log(`🔍 DEBUG: Status: ${status}`)
        } else {
          status = AttendanceStatus.PRESENT
        }
      } else {
        status = AttendanceStatus.PRESENT // Default to present if no late deduction logic
      }
      
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
      
      // Create late deduction record if applicable
      if (lateDeduction > 0) {
        console.log(`🔍 DEBUG: Creating late deduction for user ${users_id}`)
        console.log(`🔍 DEBUG: lateDeduction = ${lateDeduction}, lateSeconds = ${lateSeconds}`)
        await createLateDeduction(users_id, lateDeduction, Math.round(lateSeconds / 60), now)
        console.log(`✅ Created late deduction: ${lateDeduction} for user ${users_id} (${lateSeconds} seconds late)`)
      } else {
        console.log(`🔍 DEBUG: No late deduction for user ${users_id} - lateDeduction = ${lateDeduction}`)
      }
    } else if (!record.timeIn) {
      // Time-in for existing record - determine status based on timing
      if (settings?.timeInEnd) {
        // Get user's basic salary for calculation
        const userWithSalary = await prisma.user.findUnique({
          where: { users_id },
          include: { personnelType: true }
        })
        
        if (userWithSalary?.personnelType?.basicSalary) {
          const basicSalary = Number(userWithSalary.personnelType.basicSalary)
          // Create expected time from settings using TODAY's date in Philippines timezone
          // Extract date components from the Philippines time
          const phTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
          const phDate = new Date(phTimeString)
          const year = phDate.getFullYear()
          const month = phDate.getMonth()
          const date = phDate.getDate()
          
          const [hours, minutes] = settings.timeInEnd.split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (05:31 AM instead of 05:30 AM)
          const expectedMinutes = minutes + 1
          const expectedHours = expectedMinutes >= 60 ? hours + 1 : hours
          const finalMinutes = expectedMinutes >= 60 ? expectedMinutes - 60 : expectedMinutes
          
          // Create expected time in Philippines timezone
          const expectedTime = new Date(year, month, date, expectedHours, finalMinutes, 0, 0)
          
          const lateDeductionAmount = await calculateLateDeduction(basicSalary, now, expectedTime)
          lateSeconds = Math.max(0, (now.getTime() - expectedTime.getTime()) / 1000)
          
          lateDeduction = lateDeductionAmount
          lateSeconds = Math.floor(lateSeconds)
          status = lateSeconds > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
          
          console.log(`🔍 DEBUG: Late deduction calculation for user ${users_id}:`)
          console.log(`🔍 DEBUG: Current time: ${now.toISOString()}`)
          console.log(`🔍 DEBUG: Expected time: ${expectedTime.toISOString()}`)
          console.log(`🔍 DEBUG: Basic salary: ${basicSalary}`)
          console.log(`🔍 DEBUG: Late seconds: ${lateSeconds}`)
          console.log(`🔍 DEBUG: Per-second rate: ₱${(basicSalary / 22 / 8 / 60 / 60).toFixed(6)}`)
          console.log(`🔍 DEBUG: Late deduction amount: ${lateDeductionAmount}`)
          console.log(`🔍 DEBUG: Status: ${status}`)
        } else {
          status = AttendanceStatus.PRESENT
        }
      } else {
        status = AttendanceStatus.PRESENT // Default to present if no late deduction logic
      }
      
      record = await prisma.attendance.update({
        where: { attendances_id: record.attendances_id },
        data: { timeIn: now, status },
      })
      
      // Create late deduction if applicable
      if (lateDeduction > 0) {
        console.log(`🔍 DEBUG: Creating late deduction for user ${users_id} (existing record)`)
        console.log(`🔍 DEBUG: lateDeduction = ${lateDeduction}, lateSeconds = ${lateSeconds}`)
        await createLateDeduction(users_id, lateDeduction, Math.round(lateSeconds / 60), now)
        console.log(`✅ Created late deduction: ${lateDeduction} for user ${users_id} (${lateSeconds} seconds late)`)
      } else {
        console.log(`🔍 DEBUG: No late deduction created for user ${users_id} (existing record) - lateDeduction = ${lateDeduction}`)
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
      
      // Create early timeout deduction record if applicable
      if (earlyTimeoutDeduction > 0) {
        console.log(`🔍 DEBUG: Creating early timeout deduction for user ${users_id}`)
        console.log(`🔍 DEBUG: earlyTimeoutDeduction = ${earlyTimeoutDeduction}, earlySeconds = ${earlySeconds}`)
        const { createEarlyTimeoutDeduction } = await import('@/lib/attendance-calculations')
        await createEarlyTimeoutDeduction(users_id, earlyTimeoutDeduction, Math.round(earlySeconds / 60), now)
        console.log(`✅ Created early timeout deduction: ${earlyTimeoutDeduction} for user ${users_id} (${Math.floor(earlySeconds / 60)} minutes early)`)
      } else {
        console.log(`🔍 DEBUG: No early timeout deduction for user ${users_id} - earlyTimeoutDeduction = ${earlyTimeoutDeduction}`)
      }
    } else {
      return NextResponse.json({ error: 'Already timed in and out today' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      record: {
        attendances_id: record.attendances_id,
        users_id: record.users_id,
        date: record.date.toISOString(),
        timeIn: record.timeIn?.toISOString() || null,
        timeOut: record.timeOut?.toISOString() || null,
        status: record.status,
      },
      lateDeduction: lateDeduction > 0 ? {
        minutes: lateSeconds,
        amount: lateDeduction
      } : null,
      earlyTimeoutDeduction: earlyTimeoutDeduction > 0 ? {
        minutes: Math.floor(earlySeconds / 60),
        amount: earlyTimeoutDeduction
      } : null
    })
  } catch (error) {
    console.error('Error punching attendance:', error)
    return NextResponse.json({ error: 'Failed to punch attendance' }, { status: 500 })
  }
}



