import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateLateDeduction, calculateAbsenceDeduction, calculatePartialDeduction, calculateEarnings } from "@/lib/attendance-calculations"

async function getPeriodFromRequest(request: NextRequest) {
  // Accept JSON body or query params: periodStart, periodEnd (ISO strings)
  let periodStart: Date | null = null
  let periodEnd: Date | null = null
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json().catch(() => null)
      if (body?.periodStart && body?.periodEnd) {
        periodStart = new Date(body.periodStart)
        periodEnd = new Date(body.periodEnd)
      }
    }
  } catch {}
  if (!periodStart || !periodEnd) {
    const { searchParams } = new URL(request.url)
    const ps = searchParams.get('periodStart')
    const pe = searchParams.get('periodEnd')
    if (ps && pe) {
      periodStart = new Date(ps)
      periodEnd = new Date(pe)
    }
  }
  if (!periodStart || !periodEnd) {
    // Fallback: use today's start/end so endpoint remains usable
    const today = new Date()
    periodStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
    periodEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
  }
  return { periodStart, periodEnd }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Manual payroll release request received')
    
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    console.log('Current time:', now.toISOString())

    // Get the request body to check for next payroll scheduling
    const body = await request.json().catch(() => ({}))
    const { nextPayrollDate, nextPayrollNotes } = body
    const { periodStart, periodEnd } = await getPeriodFromRequest(request)
    console.log('Requested payroll period:', { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() })
    
    // Refuse if any released payroll overlaps the selected period
    const existingReleased = await prisma.payrollEntry.count({
      where: {
        status: 'RELEASED',
        processedAt: { gte: periodStart, lte: periodEnd },
      }
    })
    if (existingReleased > 0) {
      return NextResponse.json({
        error: 'Release refused. Archive existing released payroll entries for this period first.'
      }, { status: 400 })
    }

    // Get all pending payroll entries for requested period
    const pendingPayrolls = await prisma.payrollEntry.findMany({
      where: {
        status: 'PENDING',
        processedAt: { gte: periodStart, lte: periodEnd }
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

    console.log(`Found ${pendingPayrolls.length} pending payroll entries`)

    if (pendingPayrolls.length === 0) {
      console.log('No pending payroll entries found for current period')
      return NextResponse.json({ 
        error: 'No pending payroll entries found to release for current period',
        releasedCount: 0
      }, { status: 400 })
    }

    // Block release if any personnel lacks personnel type (basic salary)
    const missingPersonnelType = pendingPayrolls.filter(p => !p.user?.personnelType)
    if (missingPersonnelType.length > 0) {
      const blocked = missingPersonnelType.map(p => ({ users_id: p.user?.users_id, name: p.user?.name, email: p.user?.email }))
      return NextResponse.json({
        error: 'Some users have no personnel type (basic salary). Assign before releasing.',
        blocked
      }, { status: 400 })
    }

    const userIds = pendingPayrolls.map(p => p.users_id)

    // Get current attendance data for real-time calculation
    const attendance = await prisma.attendance.findMany({
      where: { 
        users_id: { in: userIds }, 
        date: { gte: periodStart, lte: periodEnd }
      },
      select: {
        users_id: true,
        timeIn: true,
        timeOut: true,
        status: true,
        date: true
      }
    })

    // Get non-attendance related deductions only
    const attendanceRelatedTypes = ['Late Arrival', 'Absence Deduction', 'Partial Attendance']
    const deductions = await prisma.deduction.findMany({
      where: { 
        users_id: { in: userIds }, 
        appliedAt: { gte: periodStart, lte: periodEnd },
        deductionType: {
          name: {
            notIn: attendanceRelatedTypes
          }
        }
      },
      include: {
        deductionType: {
          select: {
            name: true,
            description: true
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    })

    // Get active loans for current period
    const loans = await prisma.loan.findMany({
      where: { 
        users_id: { in: userIds }, 
        status: 'ACTIVE',
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart }
      },
      select: {
        users_id: true,
        amount: true,
        balance: true,
        monthlyPaymentPercent: true,
        termMonths: true
      }
    })

    // Calculate attendance deductions and work hours (earnings not used for base pay)
    const earningsMap = new Map()
    const attendanceDeductionsMap = new Map()
    const workHoursMap = new Map()
    
    attendance.forEach(record => {
      const userId = record.users_id
      const user = pendingPayrolls.find(p => p.users_id === userId)?.user
      if (!user || !user.personnelType) return
      
      const basicSalary = Number(user.personnelType.basicSalary)
      let dayEarnings = 0
      let dayDeductions = 0
      let dayWorkHours = 0
      
      if (record.status === 'PRESENT') {
        if (record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const timeOut = record.timeOut ? new Date(record.timeOut) : undefined
          // Earnings tracked for analytics only; base pay is period pro-rated
          dayEarnings = calculateEarnings(basicSalary, timeIn, timeOut)
          const endTime = timeOut || new Date()
          dayWorkHours = (endTime.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        }
        dayDeductions = 0
      } else if (record.status === 'LATE') {
        if (record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const timeOut = record.timeOut ? new Date(record.timeOut) : undefined
          dayEarnings = calculateEarnings(basicSalary, timeIn, timeOut)
          // Get attendance settings for proper time calculation
          const attendanceSettings = await prisma.attendanceSettings.findFirst()
          const timeInEnd = attendanceSettings?.timeInEnd || '09:00' // Default to 9:00 AM if no settings
          const expectedTimeIn = new Date(record.date)
          const [hours, minutes] = timeInEnd.split(':').map(Number)
          expectedTimeIn.setHours(hours, minutes, 0, 0)
          dayDeductions = calculateLateDeduction(basicSalary, timeIn, expectedTimeIn)
          const endTime = timeOut || new Date()
          dayWorkHours = (endTime.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        } else {
          dayEarnings = 0
          dayDeductions = 0
          dayWorkHours = 0
        }
      } else if (record.status === 'ABSENT') {
        dayEarnings = 0
        dayDeductions = calculateAbsenceDeduction(basicSalary)
        dayWorkHours = 0
      } else if (record.status === 'PARTIAL') {
        if (record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const timeOut = record.timeOut ? new Date(record.timeOut) : undefined
          dayEarnings = calculateEarnings(basicSalary, timeIn, timeOut)
          const workHours = timeOut ? (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60) : 0
          dayDeductions = calculatePartialDeduction(basicSalary, workHours)
          dayWorkHours = workHours
        }
      }
      
      const currentEarnings = earningsMap.get(userId) || 0
      const currentDeductions = attendanceDeductionsMap.get(userId) || 0
      const currentWorkHours = workHoursMap.get(userId) || 0
      earningsMap.set(userId, currentEarnings + dayEarnings)
      attendanceDeductionsMap.set(userId, currentDeductions + dayDeductions)
      workHoursMap.set(userId, currentWorkHours + dayWorkHours)
    })
    
    // Set 0 for users with no attendance records
    userIds.forEach(userId => {
      if (!earningsMap.has(userId)) {
        earningsMap.set(userId, 0)
      }
      if (!attendanceDeductionsMap.has(userId)) {
        attendanceDeductionsMap.set(userId, 0)
      }
      if (!workHoursMap.has(userId)) {
        workHoursMap.set(userId, 0)
      }
    })
    
    // Group non-attendance deductions by user
    const deductionsByUser = new Map()
    deductions.forEach(deduction => {
      const userId = deduction.users_id
      if (!deductionsByUser.has(userId)) {
        deductionsByUser.set(userId, [])
      }
      deductionsByUser.get(userId).push({
        id: deduction.deductions_id,
        amount: Number(deduction.amount),
        type: deduction.deductionType.name,
        description: deduction.deductionType.description,
        appliedAt: deduction.appliedAt,
        notes: deduction.notes
      })
    })
    
    const deductionsMap = new Map()
    deductionsByUser.forEach((userDeductions, userId) => {
      const totalAmount = userDeductions.reduce((sum, d) => sum + d.amount, 0)
      deductionsMap.set(userId, { total: totalAmount, details: userDeductions })
    })

    // Calculate loan payments per release (charge full monthly payment per release)
    const loanPaymentsMap = new Map()
    loans.forEach(loan => {
      const loanAmount = Number(loan.amount)
      const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
      const perReleasePayment = (loanAmount * monthlyPaymentPercent) / 100
      loanPaymentsMap.set(loan.users_id, (loanPaymentsMap.get(loan.users_id) || 0) + perReleasePayment)
    })

    // Recalculate payroll with current data and update to released
    const updatedPayrolls = []
    
    for (const payroll of pendingPayrolls) {
      const user = payroll.user
      if (!user || !user.personnelType) continue
      
      const monthlyBasic = Number(user.personnelType.basicSalary)
      const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate()
      const periodDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      const periodBasePay = (monthlyBasic * periodDays) / daysInMonth
      const deductionData = deductionsMap.get(user.users_id) || { total: 0, details: [] }
      const nonAttendanceDeductions = deductionData.total
      const attendanceDeductions = attendanceDeductionsMap.get(user.users_id) || 0
      const realTimeEarnings = earningsMap.get(user.users_id) || 0 // informational only
      const realWorkHours = workHoursMap.get(user.users_id) || 0 // informational only
      const loanPayments = loanPaymentsMap.get(user.users_id) || 0
      
      // Calculate total deductions (attendance + non-attendance + loans)
      const totalDeductions = attendanceDeductions + nonAttendanceDeductions + loanPayments
      
      // Calculate net pay (pro-rated base pay - total deductions). No overtime.
      const grossPay = periodBasePay
      const netPay = Math.max(0, grossPay - totalDeductions)

      // Update the payroll entry with recalculated values
      console.log(`Updating payroll entry ${payroll.payroll_entries_id} for user ${user.users_id}`)
      const updatedPayroll = await prisma.payrollEntry.update({
        where: {
          payroll_entries_id: payroll.payroll_entries_id
        },
        data: {
          basicSalary: periodBasePay,
          overtime: 0,
          deductions: totalDeductions,
          netPay: netPay,
          status: 'RELEASED',
          releasedAt: now
        }
      })
      console.log(`Successfully updated payroll entry ${payroll.payroll_entries_id}`)

      // Update loan balances for this user if they have loan payments
      if (loanPayments > 0) {
        const userLoans = loans.filter(loan => loan.users_id === user.users_id)
        
        for (const loan of userLoans) {
          const loanAmount = Number(loan.amount)
          const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
          const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
          const biweeklyPayment = monthlyPayment / 2
          
          // Calculate new balance (current balance - biweekly payment)
          const currentBalance = Number(loan.balance)
          const newBalance = Math.max(0, currentBalance - biweeklyPayment)
          
          // Update loan balance
          await prisma.loan.update({
            where: { loans_id: loan.loans_id },
            data: { 
              balance: newBalance,
              // Mark loan as completed if balance reaches 0
              status: newBalance <= 0 ? 'COMPLETED' : 'ACTIVE'
            }
          })
          
          console.log(`Updated loan ${loan.loans_id} for ${user.name}: balance reduced from ₱${currentBalance.toFixed(2)} to ₱${newBalance.toFixed(2)}`)
        }
      }

      updatedPayrolls.push({
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        periodBasePay,
        realTimeEarnings,
        realWorkHours,
        overtimePay: 0,
        attendanceDeductions,
        nonAttendanceDeductions,
        loanPayments,
        grossPay,
        totalDeductions,
        netPay,
        periodStart: payroll.periodStart,
        periodEnd: payroll.periodEnd
      })
    }

    console.log(`Manually released ${updatedPayrolls.length} payroll entries with loan deductions applied`)

    // Schedule next payroll if date is provided
    let nextSchedule = null
    if (nextPayrollDate) {
      try {
        // Deactivate any existing active schedules
        await prisma.payrollSchedule.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        })

        // Create new schedule for next payroll
        nextSchedule = await prisma.payrollSchedule.create({
          data: {
            scheduledDate: new Date(nextPayrollDate),
            notes: nextPayrollNotes || null,
            isActive: true
          }
        })

        console.log(`Next payroll scheduled for: ${nextPayrollDate}`)
      } catch (error) {
        console.error('Error scheduling next payroll:', error)
        // Don't fail the request if scheduling fails
      }
    }

    // Clear any existing schedule files
    try {
      const fs = require('fs')
      const path = require('path')
      const scheduleFile = path.join(process.cwd(), 'payroll-schedule.json')
      
      if (fs.existsSync(scheduleFile)) {
        fs.unlinkSync(scheduleFile)
        console.log('Cleared existing schedule file')
      }
    } catch (error) {
      console.error('Error clearing schedule file:', error)
      // Don't fail the request if we can't clear the schedule file
    }

    return NextResponse.json({
      message: `Successfully released payroll for ${updatedPayrolls.length} employees with loan deductions applied`,
      releasedCount: updatedPayrolls.length,
      releasedAt: now,
      releasedEntries: updatedPayrolls,
      nextSchedule: nextSchedule ? {
        id: nextSchedule.payroll_schedule_id,
        scheduledDate: nextSchedule.scheduledDate.toISOString(),
        notes: nextSchedule.notes
      } : null
    })

  } catch (error) {
    console.error('Error in manual release:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to manually release payroll',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

