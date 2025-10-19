import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth } from "date-fns"
import { calculateLateDeduction, calculateAbsenceDeduction, calculatePartialDeduction, calculateEarnings, calculateDailyEarnings } from "@/lib/attendance-calculations"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    // Get all personnel users with their attendance data for current month
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      include: {
        personnelType: {
          select: {
            personnel_types_id: true,
            name: true,
            basicSalary: true,
            isActive: true
          }
        },
        attendances: {
          where: {
            date: {
              gte: startOfCurrentMonth,
              lte: endOfCurrentMonth
            }
          }
        }
      }
    })

    // Deductions are now calculated directly from attendance records
    // No need to fetch separate deduction records to avoid double counting

    // Earnings are now calculated based on personnel type and attendance status
    // No need to fetch payroll data since we calculate from personnel type salary structure

    // Get attendance settings for proper time calculation
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '09:00' // Default to 9:00 AM if no settings

    // Calculate personnel attendance summary
    const personnelData = await Promise.all(users.map(async (user) => {
      const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
      const monthlySalary = basicSalary
      const hourlyRate = monthlySalary / (22 * 8) // 22 working days * 8 hours per day
      
      let totalDays = 0
      let presentDays = 0
      let absentDays = 0
      let totalHours = 0
      let totalEarnings = 0 // Calculate based on ACTUAL work hours
      let totalDeductions = 0 // Calculate based on attendance status and actual deduction records

      // Calculate working days in current month (excluding weekends)
      const currentDate = new Date(startOfCurrentMonth)
      while (currentDate <= endOfCurrentMonth) {
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
          totalDays++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Process attendance records
      for (const attendance of user.attendances) {
        let dayHours = 0
        let dayEarnings = 0
        let dayDeductions = 0
        
        // Calculate ACTUAL work hours for this day
        if (attendance.timeIn && attendance.timeOut) {
          // Complete attendance: calculate actual hours worked
          const timeIn = new Date(attendance.timeIn)
          const timeOut = new Date(attendance.timeOut)
          dayHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        } else if (attendance.timeIn && !attendance.timeOut) {
          // Incomplete attendance: calculate hours from time-in to now
          const timeIn = new Date(attendance.timeIn)
          const now = new Date()
          dayHours = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        }
        
        totalHours += Math.max(0, dayHours)
        
        // Calculate earnings and deductions based on ACTUAL seconds worked
        if (attendance.status === 'PRESENT') {
          presentDays++
          // Earnings based on actual seconds worked
          if (attendance.timeIn) {
            const timeIn = new Date(attendance.timeIn)
            const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
            dayEarnings = calculateEarnings(monthlySalary, timeIn, timeOut)
          }
          dayDeductions = 0 // No deductions for present
        } else if (attendance.status === 'LATE') {
          presentDays++
          // Earnings based on actual seconds worked
          if (attendance.timeIn) {
            const timeIn = new Date(attendance.timeIn)
            const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
            dayEarnings = calculateEarnings(monthlySalary, timeIn, timeOut)
            // Calculate actual per-second late deduction using attendance settings
            const expectedTimeIn = new Date(attendance.date)
            const [hours, minutes] = timeInEnd.split(':').map(Number)
            expectedTimeIn.setHours(hours, minutes, 0, 0)
            dayDeductions = await calculateLateDeduction(monthlySalary, timeIn, expectedTimeIn)
          } else {
            dayEarnings = 0
            dayDeductions = 0
          }
        } else if (attendance.status === 'PENDING') {
          // Pending status - no earnings or deductions until attendance is completed
          dayEarnings = 0
          dayDeductions = 0
        } else if (attendance.status === 'ABSENT') {
          absentDays++
          dayEarnings = 0 // No earnings for absent
          // Calculate absence deduction from attendance record
          dayDeductions = await calculateAbsenceDeduction(monthlySalary)
        } else if (attendance.status === 'PARTIAL') {
          presentDays++
          // Earnings based on actual seconds worked
          if (attendance.timeIn) {
            const timeIn = new Date(attendance.timeIn)
            const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
            dayEarnings = calculateEarnings(monthlySalary, timeIn, timeOut)
          }
          // Calculate partial deduction from attendance record
          dayDeductions = await calculatePartialDeduction(monthlySalary, dayHours)
        }
        
        totalEarnings += dayEarnings
        totalDeductions += dayDeductions
      }

      // Calculate absent days (total working days - present days)
      const actualAbsentDays = totalDays - presentDays
      absentDays += actualAbsentDays
      
      // Add deductions for absent days (no attendance record exists for these days)
      const absentDayDeductions = actualAbsentDays * await calculateAbsenceDeduction(monthlySalary)
      totalDeductions += absentDayDeductions

      return {
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        personnelType: user.personnelType,
        totalDays,
        presentDays,
        absentDays,
        totalHours,
        totalEarnings,
        totalDeductions
      }
    }))

    return NextResponse.json({ personnel: personnelData })
  } catch (error) {
    console.error('Error fetching personnel attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personnel data' },
      { status: 500 }
    )
  }
}


