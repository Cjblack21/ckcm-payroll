import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateLateDeductionSync, calculateAbsenceDeductionSync, calculateEarnings } from "@/lib/attendance-calculations-sync"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user.role !== 'PERSONNEL' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Determine current period aligned with attendance settings; cap end to today
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date
    const settings = await prisma.attendanceSettings.findFirst()
    if (settings?.periodStart && settings?.periodEnd) {
      periodStart = new Date(settings.periodStart)
      periodEnd = new Date(settings.periodEnd)
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    periodEnd.setHours(23, 59, 59, 999)
    const todayEOD = new Date(); todayEOD.setHours(23, 59, 59, 999)
    if (periodEnd > todayEOD) periodEnd = todayEOD
    
    // Get user details with personnel type
    const user = await prisma.user.findUnique({
      where: { users_id: userId },
      include: {
        personnelType: {
          select: {
            name: true,
            basicSalary: true,
            department: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0

    // Get today's attendance status
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        users_id: userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Calculate hours worked today
    let hoursWorked = 0
    if (todayAttendance?.timeIn && todayAttendance?.timeOut) {
      const timeIn = new Date(todayAttendance.timeIn)
      const timeOut = new Date(todayAttendance.timeOut)
      hoursWorked = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60) // Convert to hours
    }

    // Get attendance for current period (aligned with settings)
    const monthlyAttendance = await prisma.attendance.findMany({
      where: {
        users_id: userId,
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    })

    // Get current period payroll status (only consider RELEASED for personnel dashboard visibility)
    const currentPayroll = await prisma.payrollEntry.findFirst({
      where: {
        users_id: userId,
        status: 'RELEASED',
        AND: [
          { periodStart: { lte: periodEnd } },
          { periodEnd: { gte: periodStart } }
        ]
      },
      orderBy: {
        releasedAt: 'desc'
      }
    })

    // Estimate next payout date as the end of current settings period
    const nextPeriod = { periodStart, periodEnd }
    
    // Get non-attendance related deductions only (attendance deductions calculated real-time)
    const deductions = await prisma.deduction.findMany({
      where: {
        users_id: userId,
        appliedAt: {
          gte: periodStart,
          lte: periodEnd
        },
        deductionType: {
          name: {
            notIn: ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Early Time-Out', 'Partial Attendance']
          }
        }
      },
      include: {
        deductionType: {
          select: {
            name: true,
            amount: true
          }
        }
      }
    })

    // Get active loans
    const activeLoans = await prisma.loan.findMany({
      where: {
        users_id: userId,
        status: 'ACTIVE'
      }
    })

    // Calculate loan payments per payroll based on loan amount percent and period length
    const loanPayments = activeLoans.reduce((total, loan) => {
      const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      const periodDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const factor = periodDays <= 16 ? 0.5 : 1.0
      return total + (monthlyPayment * factor)
    }, 0)

    // Get attendance settings for deduction calculations
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '09:30'

    // Compute working days in period (exclude Sundays), capped to today
    let workingDaysInPeriod = 22
    {
      const startDate = new Date(periodStart)
      const endDate = new Date(periodEnd)
      const todayCap = new Date(); todayCap.setHours(23,59,59,999)
      const cappedEnd = endDate > todayCap ? todayCap : endDate
      let days = 0
      const cursor = new Date(startDate)
      while (cursor <= cappedEnd) {
        if (cursor.getDay() !== 0) days++
        cursor.setDate(cursor.getDate() + 1)
      }
      workingDaysInPeriod = Math.max(1, days)
    }

    // Calculate real-time attendance deductions from attendance records (sync)
    const attendanceDeductions = monthlyAttendance.reduce((total, attendance) => {
      let dayDeductions = 0
      if (attendance.status === 'LATE' && attendance.timeIn) {
        const timeIn = new Date(attendance.timeIn)
        const expectedTimeIn = new Date(attendance.date)
        const [hours, minutes] = timeInEnd.split(':').map(Number)
        const expectedMinutes = minutes + 1
        if (expectedMinutes >= 60) {
          expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
        } else {
          expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
        }
        dayDeductions = calculateLateDeductionSync(basicSalary, timeIn, expectedTimeIn, workingDaysInPeriod)
      } else if (attendance.status === 'ABSENT') {
        dayDeductions = calculateAbsenceDeductionSync(basicSalary, workingDaysInPeriod)
      } else if (attendance.status === 'PARTIAL' && attendance.timeIn) {
        const timeIn = new Date(attendance.timeIn)
        const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
        const workHours = timeOut ? (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60) : 0
        const dailyEarnings = basicSalary / workingDaysInPeriod
        const hourlyRate = dailyEarnings / 8
        const hoursShort = Math.max(0, 8 - workHours)
        dayDeductions = hoursShort * hourlyRate
      }
      return total + dayDeductions
    }, 0)

    // Calculate total deductions (non-attendance + attendance real-time + loans)
    const nonAttendanceDeductions = deductions.reduce((total, deduction) => {
      return total + Number(deduction.amount)
    }, 0)
    const totalDeductions = nonAttendanceDeductions + attendanceDeductions + loanPayments

    // Calculate salary for period (full period basic, not forced biweekly)
    const periodDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const periodFactor = periodDays <= 16 ? 0.5 : 1.0
    const periodSalary = basicSalary * periodFactor

    // Calculate net pay
    const netPay = Math.max(0, periodSalary - totalDeductions)

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        position: user.personnelType?.name || 'No position assigned',
        department: user.personnelType?.department || 'No department assigned',
        basicSalary: basicSalary,
        periodSalary: periodSalary
      },
      todayStatus: {
        status: todayAttendance?.status || 'ABSENT',
        timeIn: todayAttendance?.timeIn || null,
        timeOut: todayAttendance?.timeOut || null,
        hours: hoursWorked
      },
      monthlyAttendance: {
        totalDays: monthlyAttendance.length,
        presentDays: monthlyAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length,
        absentDays: monthlyAttendance.filter(a => a.status === 'ABSENT').length,
        lateDays: monthlyAttendance.filter(a => a.status === 'LATE').length,
        attendanceRate: monthlyAttendance.length > 0 
          ? (((monthlyAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length) / monthlyAttendance.length) * 100).toFixed(1)
          : '0'
      },
      currentPayroll: currentPayroll ? {
        status: currentPayroll.status,
        netPay: Number(currentPayroll.netPay),
        basicSalary: Number(currentPayroll.basicSalary),
        deductions: Number(currentPayroll.deductions),
        releasedAt: currentPayroll.releasedAt || null
      } : {
        status: 'PENDING',
        netPay: 0,
        basicSalary: 0,
        deductions: 0,
        releasedAt: null
      },
      nextPayout: {
        date: nextPeriod.periodEnd,
        amount: netPay,
        period: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
      },
      deductions: deductions.map(d => ({
        name: d.deductionType.name,
        amount: Number(d.amount),
        appliedAt: d.appliedAt
      })),
      loans: activeLoans.map(loan => ({
        purpose: loan.purpose,
        balance: Number(loan.balance),
        monthlyPayment: (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100,
        perPayrollPayment: ((Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100) * periodFactor,
        termMonths: loan.termMonths
      }))
    })

  } catch (error) {
    console.error('Error fetching personnel dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

// Function to get current biweekly period
function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  
  // Find the first Monday of the year
  const firstMonday = new Date(year, 0, 1)
  const dayOfWeek = firstMonday.getDay()
  const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  firstMonday.setDate(firstMonday.getDate() + daysToAdd)
  
  // Calculate which biweekly period we're in
  const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
  const biweeklyPeriod = Math.floor(daysSinceFirstMonday / 14)
  
  // Calculate start and end of current biweekly period
  const periodStart = new Date(firstMonday)
  periodStart.setDate(periodStart.getDate() + (biweeklyPeriod * 14))
  
  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 13)
  periodEnd.setHours(23, 59, 59, 999)
  
  return { periodStart, periodEnd }
}

// Function to get next biweekly period
function getNextBiweeklyPeriod() {
  const { periodEnd } = getCurrentBiweeklyPeriod()
  
  const nextPeriodStart = new Date(periodEnd)
  nextPeriodStart.setDate(nextPeriodStart.getDate() + 1)
  nextPeriodStart.setHours(0, 0, 0, 0)
  
  const nextPeriodEnd = new Date(nextPeriodStart)
  nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 13)
  nextPeriodEnd.setHours(23, 59, 59, 999)
  
  return { periodStart: nextPeriodStart, periodEnd: nextPeriodEnd }
}
