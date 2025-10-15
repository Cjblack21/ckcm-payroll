import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStartOfDayInPhilippines, getEndOfDayInPhilippines, getNowInPhilippines } from "@/lib/timezone"
import { calculateLateDeduction, calculateEarlyTimeoutDeduction, createLateDeduction } from "@/lib/attendance-calculations"
import { AttendanceStatus } from "@prisma/client"

function isWithinWindow(nowHHmm: string, start?: string | null, end?: string | null): boolean {
  if (!start || !end) return true
  return start <= nowHHmm && nowHHmm <= end
}



export async function POST(request: NextRequest) {
  try {
    const { users_id } = await request.json()
    if (!users_id || typeof users_id !== 'string') {
      return NextResponse.json({ error: 'users_id is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { users_id } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const settings = await prisma.attendanceSettings.findFirst()
    const now = getNowInPhilippines()
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

    const startToday = getStartOfDayInPhilippines(now)
    const endToday = getEndOfDayInPhilippines(now)

    // Find or create today's record
    let record = await prisma.attendance.findFirst({
      where: { users_id, date: { gte: startToday, lte: endToday } },
    })

    // Decide punch direction
    const isTimeInPhase = !record || !record.timeIn

    // Validate windows
    if (isTimeInPhase) {
      console.log('🕐 Time-in phase validation:')
      // For time-in, validate against time-in window
      if (settings) {
        // Convert times to minutes for proper comparison
        const currentMinutes = parseInt(nowHH) * 60 + parseInt(nowMM)
        const startMinutes = parseInt(settings.timeInStart!.split(':')[0]) * 60 + parseInt(settings.timeInStart!.split(':')[1])
        const endMinutes = parseInt(settings.timeInEnd!.split(':')[0]) * 60 + parseInt(settings.timeInEnd!.split(':')[1])
        
        console.log(`Time comparison: ${nowHHmm} (${currentMinutes} min) vs ${settings.timeInStart} (${startMinutes} min) to ${settings.timeInEnd} (${endMinutes} min)`)
        
        // Check if this is an overnight window (start > end, like 23:58 to 09:00)
        const isOvernightWindow = startMinutes > endMinutes
        
        let isWithinWindow = false
        
        if (isOvernightWindow) {
          // Overnight window: current time is valid if it's >= start OR <= end
          isWithinWindow = currentMinutes >= startMinutes || currentMinutes <= endMinutes
          console.log(`Overnight window: ${currentMinutes} >= ${startMinutes} OR ${currentMinutes} <= ${endMinutes} = ${isWithinWindow}`)
        } else {
          // Normal window: current time is valid if it's >= start AND <= end
          isWithinWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes
          console.log(`Normal window: ${currentMinutes} >= ${startMinutes} AND ${currentMinutes} <= ${endMinutes} = ${isWithinWindow}`)
        }
        
        // Allow late time-ins - they will be marked as LATE status
        if (!isWithinWindow) {
          console.log('⚠️ LATE TIME-IN: Outside preferred window, will be marked as LATE')
        } else {
          console.log('✅ ON-TIME: Within preferred time window')
        }
        console.log('✅ Time-in validation passed - allowing late time-ins')
      } else {
        console.log('⚠️ No settings found - allowing time-in')
      }
    } else {
      // Allow timeout anytime - no blocking of early timeouts as per new requirements
      console.log('⏰ Time-out phase: Allowing timeout at any time')
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
          // Create expected time from settings
          const expectedTime = new Date()
          const [hours, minutes] = settings.timeInEnd.split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
          const expectedMinutes = minutes + 1
          if (expectedMinutes >= 60) {
            expectedTime.setHours(hours + 1, expectedMinutes - 60, 0, 0)
          } else {
            expectedTime.setHours(hours, expectedMinutes, 0, 0)
          }
          
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
      
      // Late deduction calculated real-time from attendance record
      // No need to store separate deduction records
      if (lateDeduction > 0) {
        console.log(`🔍 DEBUG: Real-time late deduction calculated for user ${users_id}`)
        console.log(`🔍 DEBUG: lateDeduction = ${lateDeduction}, lateSeconds = ${lateSeconds}`)
        console.log(`✅ Real-time late deduction: ${lateDeduction} for user ${users_id} (${lateSeconds} seconds late)`)
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
          // Create expected time from settings
          const expectedTime = new Date()
          const [hours, minutes] = settings.timeInEnd.split(':').map(Number)
          // Deductions start 1 minute after timeInEnd (09:31 AM instead of 09:30 AM)
          const expectedMinutes = minutes + 1
          if (expectedMinutes >= 60) {
            expectedTime.setHours(hours + 1, expectedMinutes - 60, 0, 0)
          } else {
            expectedTime.setHours(hours, expectedMinutes, 0, 0)
          }
          
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



