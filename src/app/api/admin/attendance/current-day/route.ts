import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"
import { calculateLateDeduction, calculateAbsenceDeduction, calculatePartialDeduction, calculateEarnings } from "@/lib/attendance-calculations"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)
    const isSunday = today.getDay() === 0
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    })

    // Get all personnel users
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      include: {
        personnelType: {
          select: {
            basicSalary: true
          }
        }
      }
    })

    const userIds = users.map(u => u.users_id)

    // Get today's attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        users_id: { in: userIds },
        date: {
          gte: startOfToday,
          lte: endOfToday
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
                basicSalary: true
              }
            }
          }
        }
      }
    })

    // Create a map of existing attendance records
    const attendanceMap = new Map()
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.users_id, record)
    })

    // Get all attendance-related deductions for today
    const attendanceDeductions = await prisma.deduction.findMany({
      where: {
        users_id: { in: userIds },
        appliedAt: {
          gte: startOfToday,
          lte: endOfToday
        },
        deductionType: {
          name: {
            in: ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness']
          }
        }
      },
      select: {
        users_id: true,
        amount: true,
        deductionType: {
          select: {
            name: true
          }
        }
      }
    })

    // Create a map of attendance deductions by user
    const attendanceDeductionMap = new Map()
    attendanceDeductions.forEach(deduction => {
      const userId = deduction.users_id
      if (!attendanceDeductionMap.has(userId)) {
        attendanceDeductionMap.set(userId, 0)
      }
      attendanceDeductionMap.set(userId, attendanceDeductionMap.get(userId) + Number(deduction.amount))
    })

    // Earnings are now calculated based on personnel type and attendance status
    // No need to fetch payroll data since we calculate from personnel type salary structure

    // Check if we should auto-mark pending users as absent
    const now = new Date()
    const nowHH = now.getHours().toString().padStart(2, '0')
    const nowMM = now.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    
    // Get attendance settings to check time-out window
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    
    // Function to check if time-out window has passed
    const isTimeOutWindowPassed = () => {
      if (!attendanceSettings || attendanceSettings.noTimeOutCutoff) {
        return false // No time-out restrictions, don't auto-mark as absent
      }
      if (!attendanceSettings.timeOutEnd) {
        return false // No end time set, don't auto-mark as absent
      }
      return nowHHmm > attendanceSettings.timeOutEnd
    }

    // Calculate attendance data for all users (including those without records)
    const attendanceData = await Promise.all(users.map(async (user) => {
      const attendanceRecord = attendanceMap.get(user.users_id)
      
      if (attendanceRecord) {
        // Calculate work hours
        let workHours = 0
        if (attendanceRecord.timeIn && attendanceRecord.timeOut) {
          // Complete attendance: calculate actual hours worked
          const timeIn = new Date(attendanceRecord.timeIn)
          const timeOut = new Date(attendanceRecord.timeOut)
          workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        } else if (attendanceRecord.timeIn && !attendanceRecord.timeOut) {
          // Incomplete attendance: calculate hours from time-in to now
          const timeIn = new Date(attendanceRecord.timeIn)
          const now = new Date()
          workHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        }

        // Calculate earnings based on ACTUAL seconds worked
        const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
        
        let earnings = 0
        let deductions = 0
        let status = attendanceRecord.status

        // Derive status from settings if we have a timeIn
        if (attendanceRecord.timeIn) {
          const [endH, endM] = (attendanceSettings?.timeInEnd || '09:00').split(':').map(Number)
          const inEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM || 0, 0, 0)
          const actualIn = new Date(attendanceRecord.timeIn)
          status = actualIn.getTime() > inEnd.getTime() ? 'LATE' : 'PRESENT'
        }

        if (status === 'PRESENT') {
          // Earnings based on actual seconds worked
          if (attendanceRecord.timeIn) {
            const timeIn = new Date(attendanceRecord.timeIn)
            const timeOut = attendanceRecord.timeOut ? new Date(attendanceRecord.timeOut) : undefined
            earnings = calculateEarnings(basicSalary, timeIn, timeOut)
          }
          deductions = 0 // No deductions for present
        } else if (status === 'LATE') {
          // Earnings based on actual seconds worked
          if (attendanceRecord.timeIn) {
            const timeIn = new Date(attendanceRecord.timeIn)
            const timeOut = attendanceRecord.timeOut ? new Date(attendanceRecord.timeOut) : undefined
            earnings = calculateEarnings(basicSalary, timeIn, timeOut)
            // Use actual deduction records from database instead of recalculating
            deductions = attendanceDeductionMap.get(user.users_id) || 0
          } else {
            earnings = 0
            deductions = 0
          }
        } else if (status === 'PENDING') {
          // Check if time-out window has passed for pending records
          if (isTimeOutWindowPassed()) {
            // Time-out window has passed - treat as absent
            earnings = 0 // No earnings for absent
            deductions = await calculateAbsenceDeduction(basicSalary) // Calculate absence deduction
            status = 'ABSENT' // Override status to ABSENT
          } else {
            // Pending status - no earnings or deductions until attendance is completed
            earnings = 0
            deductions = 0
          }
        } else if (status === 'ABSENT') {
          earnings = 0 // No earnings for absent
          // Use actual deduction records from database instead of recalculating
          deductions = attendanceDeductionMap.get(user.users_id) || 0
        } else if (status === 'PARTIAL') {
          // Earnings based on actual seconds worked
          if (attendanceRecord.timeIn) {
            const timeIn = new Date(attendanceRecord.timeIn)
            const timeOut = attendanceRecord.timeOut ? new Date(attendanceRecord.timeOut) : undefined
            earnings = calculateEarnings(basicSalary, timeIn, timeOut)
          }
          // Calculate partial deduction for hours short
          deductions = calculatePartialDeduction(basicSalary, workHours)
        }

        return {
          attendances_id: attendanceRecord.attendances_id,
          users_id: user.users_id,
          date: attendanceRecord.date.toISOString(),
          timeIn: attendanceRecord.timeIn?.toISOString() || null,
          timeOut: attendanceRecord.timeOut?.toISOString() || null,
          status,
          user: {
            users_id: user.users_id,
            name: user.name,
            email: user.email,
            personnelType: user.personnelType
          },
          workHours: Math.max(0, workHours),
          earnings,
          deductions
        }
      } else {
        // No attendance record for today - determine status based on time-out window
        const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
        
        // If Sunday or a holiday, do not mark absent or deduct
        if (isSunday || holiday) {
          return {
            attendances_id: `non-working-${user.users_id}`,
            users_id: user.users_id,
            date: today.toISOString(),
            timeIn: null,
            timeOut: null,
            status: 'NON_WORKING' as const,
            user: {
              users_id: user.users_id,
              name: user.name,
              email: user.email,
              personnelType: user.personnelType
            },
            workHours: 0,
            earnings: 0,
            deductions: 0
          }
        }

        // Check if time-out window has passed
        if (isTimeOutWindowPassed()) {
          // Time-out window has passed - mark as absent
          const earnings = 0 // No earnings for absent
          // Use actual deduction records from database instead of recalculating
          const deductions = attendanceDeductionMap.get(user.users_id) || 0

          // Persist absence deduction idempotently
          const absenceType = await prisma.deductionType.upsert({
            where: { name: 'Absence Deduction' },
            update: {},
            create: { name: 'Absence Deduction', amount: deductions, isActive: true },
          })
          const existing = await prisma.deduction.findFirst({
            where: {
              users_id: user.users_id,
              deduction_types_id: absenceType.deduction_types_id,
              appliedAt: { gte: startOfToday, lte: endOfToday },
            },
          })
          if (existing) {
            await prisma.deduction.update({
              where: { deductions_id: existing.deductions_id },
              data: { amount: deductions },
            })
          } else {
            await prisma.deduction.create({
              data: {
                users_id: user.users_id,
                deduction_types_id: absenceType.deduction_types_id,
                amount: deductions,
                appliedAt: today,
              },
            })
          }

          return {
            attendances_id: `absent-${user.users_id}`,
            users_id: user.users_id,
            date: today.toISOString(),
            timeIn: null,
            timeOut: null,
            status: 'ABSENT' as const,
            user: {
              users_id: user.users_id,
              name: user.name,
              email: user.email,
              personnelType: user.personnelType
            },
            workHours: 0,
            earnings,
            deductions
          }
        } else {
          // Time-out window hasn't passed yet - mark as pending
          const earnings = 0 // No earnings for pending
          const deductions = 0 // No deductions for pending

          return {
            attendances_id: `pending-${user.users_id}`,
            users_id: user.users_id,
            date: today.toISOString(),
            timeIn: null,
            timeOut: null,
            status: 'PENDING' as const,
            user: {
              users_id: user.users_id,
              name: user.name,
              email: user.email,
              personnelType: user.personnelType
            },
            workHours: 0,
            earnings,
            deductions
          }
        }
      }
    }))

    return NextResponse.json({ attendance: attendanceData })
  } catch (error) {
    console.error('Error fetching current day attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}


