import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// This endpoint should be called by a cron job or scheduled task
// to automatically release payroll when the scheduled time is reached

export async function POST(request: NextRequest) {
  try {
    const now = new Date()
    
    // TODO: Get scheduled releases from database where releaseAt <= now
    // For now, we'll implement a simple check
    
    // Get current biweekly period
    const { periodStart, periodEnd } = getCurrentBiweeklyPeriod()
    
    // Check if there are any unreleased payroll entries for this period
    const existingPayrolls = await prisma.payrollEntry.findMany({
      where: {
        processedAt: { gte: periodStart, lte: periodEnd },
        status: 'PENDING'
      }
    })

    console.log(`Found ${existingPayrolls.length} existing pending payroll entries`)

    // If there are already released payrolls for this period, don't create new ones
    const releasedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        processedAt: { gte: periodStart, lte: periodEnd },
        status: 'RELEASED'
      }
    })

    if (releasedPayrolls.length > 0) {
      return NextResponse.json({ 
        message: 'Payroll already released for this period',
        releasedPayrolls: releasedPayrolls.length
      })
    }

    // Generate payroll entries for users who don't have them yet
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
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
    })

    console.log(`Found ${users.length} active personnel users`)
    console.log('Users data:', users.map(u => ({
      users_id: u.users_id,
      name: u.name,
      hasPersonnelType: !!u.personnelType,
      basicSalary: u.personnelType?.basicSalary
    })))

    const userIds = users.map(u => u.users_id)

    // Get attendance data for hours calculation
    const attendance = await prisma.attendance.groupBy({
      by: ['users_id'],
      where: { users_id: { in: userIds }, date: { gte: periodStart, lte: periodEnd }, status: 'PRESENT' },
      _count: { _all: true }
    })

    // Get current period deductions
    const deductions = await prisma.deduction.findMany({
      where: { 
        users_id: { in: userIds }, 
        appliedAt: { gte: periodStart, lte: periodEnd } 
      },
      include: {
        deductionType: {
          select: {
            name: true,
            description: true
          }
        }
      }
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

    // Create maps for calculations
    const hoursMap = new Map(attendance.map(a => [a.users_id, a._count._all * 8]))
    
    // Group deductions by user
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

    // Calculate loan payments (monthly payment = balance / remaining months)
    const loanPaymentsMap = new Map()
    loans.forEach(loan => {
      const loanAmount = Number(loan.amount)
      const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
      const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
      loanPaymentsMap.set(loan.users_id, (loanPaymentsMap.get(loan.users_id) || 0) + monthlyPayment)
    })

    // Generate payroll entries for users who don't have them yet
    const payrollEntries = []
    const processedUsers = []

    if (users.length === 0) {
      return NextResponse.json({
        message: 'No active personnel found to process payroll',
        periodStart,
        periodEnd,
        processedUsers: [],
        releasedAt: now
      })
    }

    for (const user of users) {
      const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
      const deductionData = deductionsMap.get(user.users_id) || { total: 0, details: [] }
      const totalDeductions = deductionData.total
      const loanPayments = loanPaymentsMap.get(user.users_id) || 0
      const totalHours = hoursMap.get(user.users_id) || 0
      
      // Calculate overtime (assuming 8 hours per day is standard)
      const standardHours = 10 * 8 // 10 working days per biweek
      const overtimeHours = Math.max(0, totalHours - standardHours)
      const biweeklySalary = basicSalary / 2 // Convert monthly to biweekly
      const overtimePay = overtimeHours * (biweeklySalary / standardHours) * 1.5 // 1.5x overtime rate
      
      // Calculate net pay
      const grossPay = biweeklySalary + overtimePay
      const totalDeductionsAndLoans = totalDeductions + loanPayments
      const netPay = Math.max(0, grossPay - totalDeductionsAndLoans)

      // Validate all required fields
      if (!user.users_id || isNaN(biweeklySalary) || isNaN(overtimePay) || isNaN(totalDeductionsAndLoans) || isNaN(netPay)) {
        console.error('Invalid payroll data for user:', {
          users_id: user.users_id,
          biweeklySalary,
          overtimePay,
          totalDeductionsAndLoans,
          netPay
        })
        continue // Skip this user
      }

      payrollEntries.push({
        users_id: user.users_id,
        periodStart,
        periodEnd,
        basicSalary: biweeklySalary,
        overtime: overtimePay,
        deductions: totalDeductionsAndLoans,
        netPay,
        processedAt: now
      })

      processedUsers.push({
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        basicSalary: biweeklySalary,
        overtimePay,
        totalDeductions,
        loanPayments,
        grossPay,
        netPay,
        deductionDetails: deductionData.details
      })
    }

    // Handle existing pending payroll entries or create new ones
    if (existingPayrolls.length > 0) {
      // Update existing pending payroll entries to released
      try {
        await prisma.payrollEntry.updateMany({
          where: {
            processedAt: { gte: periodStart, lte: periodEnd },
            status: 'PENDING'
          },
          data: {
            status: 'RELEASED',
            releasedAt: now
          }
        })
        console.log(`Successfully updated ${existingPayrolls.length} existing payroll entries to released`)
      } catch (dbError) {
        console.error('Database error updating payroll entries:', dbError)
        throw new Error(`Failed to update payroll entries: ${dbError.message}`)
      }
    } else if (payrollEntries.length > 0) {
      // Create new payroll entries with RELEASED status
      try {
        const entriesToCreate = payrollEntries.map(entry => ({
          ...entry,
          status: 'RELEASED',
          releasedAt: now
        }))
        
        console.log('Creating new payroll entries:', entriesToCreate)
        
        await prisma.payrollEntry.createMany({
          data: entriesToCreate
        })
        console.log(`Successfully created ${payrollEntries.length} new payroll entries`)
      } catch (dbError) {
        console.error('Database error creating payroll entries:', dbError)
        console.error('Error details:', {
          name: dbError.name,
          message: dbError.message,
          code: dbError.code,
          meta: dbError.meta
        })
        throw new Error(`Failed to create payroll entries: ${dbError.message}`)
      }
    } else {
      console.log('No payroll entries to process')
    }

    // TODO: Send email notifications if configured
    // TODO: Update schedule status to released

    // Clear the schedule file after successful release
    try {
      const fs = require('fs')
      const path = require('path')
      const scheduleFile = path.join(process.cwd(), 'payroll-schedule.json')
      
      if (fs.existsSync(scheduleFile)) {
        fs.unlinkSync(scheduleFile)
      }
    } catch (error) {
      console.error('Error clearing schedule file:', error)
    }

    const totalProcessed = existingPayrolls.length > 0 ? existingPayrolls.length : processedUsers.length
    
    return NextResponse.json({
      message: `Payroll automatically released for ${totalProcessed} employees`,
      periodStart,
      periodEnd,
      processedUsers: existingPayrolls.length > 0 ? existingPayrolls : processedUsers,
      action: existingPayrolls.length > 0 ? 'updated' : 'created',
      releasedAt: now
    })

  } catch (error) {
    console.error('Error in auto-release:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { 
        error: 'Failed to auto-release payroll',
        details: error.message,
        type: error.name
      },
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
