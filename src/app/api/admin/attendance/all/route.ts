import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateLateDeductionSync, calculateAbsenceDeductionSync, calculatePartialDeduction, calculateEarnings } from "@/lib/attendance-calculations-sync"
import { getTodayRangeInPhilippines, getNowInPhilippines, getEndOfDayInPhilippines } from "@/lib/timezone"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const dateFilter = searchParams.get('date')

    const skip = (page - 1) * limit

    // Get attendance settings to determine current period
    const attendanceSettings = await prisma.attendanceSettings.findFirst()

    // Build where clause
    const whereClause: any = {}
    
    if (dateFilter) {
      // Use explicit date filter if provided
      const filterDate = new Date(dateFilter)
      const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate())
      const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59)
      
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      }
    } else {
      // Default to show records from period start up to today (include today's records)
      if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
        const now = getNowInPhilippines()
        const endOfToday = getEndOfDayInPhilippines(now)
        
        whereClause.date = {
          gte: attendanceSettings.periodStart,
          lte: endOfToday // Include today's records up to end of today
        }
      }
    }

    // Get all attendance records including auto-marked ABSENT records
    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnelType: {
              select: {
                personnel_types_id: true,
                name: true,
                basicSalary: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc' // Most recent first
      }
    })

    // Get total count for pagination (only actual attendance records)
    const totalCount = attendanceRecords.length

    // Get attendance-related deductions for users with actual attendance records
    const userIdsWithAttendance = attendanceRecords.map(r => r.users_id)
    const actualDeductions = await prisma.deduction.findMany({
      where: {
        users_id: { in: userIdsWithAttendance },
        appliedAt: {
          gte: dateFilter ? new Date(dateFilter + 'T00:00:00.000Z') : new Date('1900-01-01'),
          lte: dateFilter ? new Date(dateFilter + 'T23:59:59.999Z') : new Date()
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
        appliedAt: true,
        deductionType: {
          select: {
            name: true
          }
        }
      }
    })

    // Create a map of deductions by user and date
    const deductionMap = new Map()
    actualDeductions.forEach(deduction => {
      const key = `${deduction.users_id}-${deduction.appliedAt.toISOString().split('T')[0]}`
      if (!deductionMap.has(key)) {
        deductionMap.set(key, 0)
      }
      deductionMap.set(key, deductionMap.get(key) + Number(deduction.amount))
    })

    // Check if we should auto-mark pending users as absent
    const now = new Date()
    const nowHH = now.getHours().toString().padStart(2, '0')
    const nowMM = now.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    
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

    // Determine target date (default today), working day, and holiday
    const targetDate = dateFilter ? new Date(dateFilter) : new Date()
    const targetStartOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const targetEndOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)
    const isSunday = targetDate.getDay() === 0
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: {
          gte: targetStartOfDay,
          lte: targetEndOfDay,
        },
      },
    })

    // Calculate working days in current period for deduction calculations
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

    // Process ONLY actual attendance records (no fake records for users without attendance)
    const attendanceData = attendanceRecords.map(attendanceRecord => {
      const user = attendanceRecord.user
      
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

      // Calculate earnings and deductions based on ACTUAL seconds worked
      const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
      
      let earnings = 0
      let deductions = 0
      let status = attendanceRecord.status

      // Derive status from settings if we have a timeIn
      if (attendanceRecord.timeIn) {
        const recordDate = new Date(attendanceRecord.date)
        const [endH, endM] = (attendanceSettings?.timeInEnd || '09:00').split(':').map(Number)
        const inEnd = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(), endH, endM || 0, 0, 0)
        const actualIn = new Date(attendanceRecord.timeIn)
        status = actualIn.getTime() > inEnd.getTime() ? 'LATE' : 'PRESENT'
      }

      if (status === 'PENDING') {
        // Check if time-out window has passed for pending records
        if (isTimeOutWindowPassed()) {
          // Time-out window has passed - treat as absent
          earnings = 0 // No earnings for absent
          deductions = calculateAbsenceDeductionSync(basicSalary, workingDaysInPeriod) // Calculate absence deduction
          status = 'ABSENT' // Override status to ABSENT
        } else {
          // Pending status - no earnings or deductions until attendance is completed
          earnings = 0
          deductions = 0
        }
      } else if (status === 'PRESENT') {
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
          // Calculate late deduction using admin-set expected time-in end
          const recordDate = new Date(attendanceRecord.date)
          const [endH, endM] = (attendanceSettings?.timeInEnd || '09:00').split(':').map(Number)
          const expectedIn = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate(), endH, endM || 0, 0, 0)
          deductions = calculateLateDeductionSync(basicSalary, timeIn, expectedIn, workingDaysInPeriod)
        } else {
          earnings = 0
          deductions = 0
        }
      } else if (status === 'ABSENT') {
        earnings = 0 // No earnings for absent
        // Calculate absence deduction (8 hours worth)
        deductions = calculateAbsenceDeductionSync(basicSalary, workingDaysInPeriod)
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

      // Add actual deduction records from database
      const recordDate = attendanceRecord.date.toISOString().split('T')[0]
      const deductionKey = `${user.users_id}-${recordDate}`
      const actualDeductions = deductionMap.get(deductionKey) || 0
      const totalDeductions = deductions + actualDeductions

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
        deductions: totalDeductions
      }
    })

    // Apply pagination to the processed data
    const paginatedData = attendanceData.slice(skip, skip + limit)

    // Debug logging
    console.log(`🔍 All Attendance Debug - Found ${attendanceRecords.length} raw records, processed ${attendanceData.length}, returning ${paginatedData.length}, working days: ${workingDaysInPeriod}`)
    console.log(`🔍 Date range: ${whereClause.date ? `${whereClause.date.gte?.toISOString()?.split('T')[0]} to ${whereClause.date.lte?.toISOString()?.split('T')[0]}` : 'No filter'}`)

    return NextResponse.json({ 
      attendance: paginatedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching all attendance records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}


