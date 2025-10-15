import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateLateDeduction, calculateAbsenceDeduction, calculatePartialDeduction, calculateEarnings, calculateDailyEarnings } from "@/lib/attendance-calculations"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await context.params

    // Get user with personnel type
    const user = await prisma.user.findUnique({
      where: { users_id: userId },
      include: {
        personnelType: {
          select: {
            basicSalary: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all attendance records for this user
    const attendanceRecords = await prisma.attendance.findMany({
      where: { users_id: userId },
      orderBy: { date: 'desc' }
    })

    const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
    const hourlyRate = basicSalary / (22 * 8) // 22 working days * 8 hours per day
    
    // Get attendance settings for proper time calculation
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '09:00' // Default to 9:00 AM if no settings

    // Process attendance records
    const attendanceData = await Promise.all(attendanceRecords.map(async (record) => {
      // Calculate ACTUAL work hours
      let workHours = 0
      if (record.timeIn && record.timeOut) {
        const timeIn = new Date(record.timeIn)
        const timeOut = new Date(record.timeOut)
        workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
      }

      // Calculate earnings and deductions based on ACTUAL work hours
      let earnings = 0
      let deductions = 0

      if (record.status === 'PRESENT') {
        // Earnings based on actual seconds worked
        if (record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const timeOut = record.timeOut ? new Date(record.timeOut) : undefined
          earnings = calculateEarnings(basicSalary, timeIn, timeOut)
        }
        deductions = 0 // No deductions for present
      } else if (record.status === 'LATE') {
        // Earnings based on actual seconds worked
        if (record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const timeOut = record.timeOut ? new Date(record.timeOut) : undefined
          earnings = calculateEarnings(basicSalary, timeIn, timeOut)
          // Calculate per-second late deduction using attendance settings
          const expectedTimeIn = new Date(record.date)
          const [hours, minutes] = timeInEnd.split(':').map(Number)
          expectedTimeIn.setHours(hours, minutes, 0, 0)
          deductions = await calculateLateDeduction(basicSalary, timeIn, expectedTimeIn)
        } else {
          earnings = 0
          deductions = 0
        }
      } else if (record.status === 'ABSENT') {
        earnings = 0 // No earnings for absent
        // Calculate absence deduction (8 hours worth)
        deductions = await calculateAbsenceDeduction(basicSalary)
      } else if (record.status === 'PARTIAL') {
        // Earnings based on actual seconds worked
        if (record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const timeOut = record.timeOut ? new Date(record.timeOut) : undefined
          earnings = calculateEarnings(basicSalary, timeIn, timeOut)
        }
        // Calculate partial deduction for hours short
        deductions = await calculatePartialDeduction(basicSalary, workHours)
      }

      return {
        attendances_id: record.attendances_id,
        users_id: record.users_id,
        date: record.date.toISOString(),
        timeIn: record.timeIn?.toISOString() || null,
        timeOut: record.timeOut?.toISOString() || null,
        status: record.status,
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
    }))

    return NextResponse.json({ attendance: attendanceData })
  } catch (error) {
    console.error('Error fetching personnel attendance history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    )
  }
}

