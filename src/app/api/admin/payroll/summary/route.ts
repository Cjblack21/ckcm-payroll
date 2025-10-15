import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateLateDeduction, calculateAbsenceDeduction, calculatePartialDeduction, calculateEarnings } from "@/lib/attendance-calculations"

// Function to get current biweekly period
function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const { periodStart, periodEnd } = getCurrentBiweeklyPeriod()
  
  console.log('Period dates:', { periodStart, periodEnd })

  // Get users with their personnel type and basic salary
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
    },
    orderBy: { name: 'asc' }
  })
  
  console.log('Users found:', users.length)

  const userIds = users.map(u => u.users_id)

  // Get all attendance data for real-time calculation
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
  
  console.log('Attendance records found:', attendance.length)

  // Get attendance settings to check time-out window
  const attendanceSettings = await prisma.attendanceSettings.findFirst()
  
  // Create a map of attendance records by user and date
  const attendanceMap = new Map()
  attendance.forEach(record => {
    const key = `${record.users_id}-${record.date.toISOString().split('T')[0]}`
    attendanceMap.set(key, record)
  })

  // Get header settings for working days
  const headerSettings = await prisma.headerSettings.findFirst()
  const configuredWorkingDays = headerSettings?.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] // Default to weekdays
  
  // Generate only working days that have actually passed (up to today)
  const workingDays = []
  const currentDate = new Date(periodStart)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  
  while (currentDate <= periodEnd && currentDate <= today) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' })
    if (configuredWorkingDays.includes(dayName)) {
      workingDays.push(new Date(currentDate))
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  console.log('Working days to process (up to today):', workingDays.length)

  // Create attendance records for all users and only for days that have passed
  const allAttendanceRecords = []
  for (const user of users) {
    for (const workingDay of workingDays) {
      const key = `${user.users_id}-${workingDay.toISOString().split('T')[0]}`
      const existingRecord = attendanceMap.get(key)
      
      if (existingRecord) {
        // Use existing attendance record
        allAttendanceRecords.push(existingRecord)
      } else {
        // Only create virtual attendance records for days when users were actually expected to work
        // For now, we'll skip creating virtual records to avoid incorrect absence deductions
        // Users should only have deductions for actual attendance violations, not for days they weren't scheduled
        
        // Skip creating virtual attendance records to prevent incorrect absence deductions
        // This means only actual attendance records (present, late, etc.) will be processed
        // Users won't be penalized for days they weren't scheduled to work
      }
    }
  }
  
  console.log('Total attendance records (including virtual):', allAttendanceRecords.length)

  // Get ALL deductions but separate attendance-related from non-attendance deductions
  const allDeductions = await prisma.deduction.findMany({
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
    },
    orderBy: { appliedAt: 'desc' }
  })

  // Separate attendance and non-attendance deductions
  const attendanceRelatedTypes = ['Late Arrival', 'Absence Deduction', 'Partial Attendance', 'Absent', 'Late', 'Tardiness']
  const attendanceDeductions = allDeductions.filter(d => attendanceRelatedTypes.includes(d.deductionType.name))
  const nonAttendanceDeductions = allDeductions.filter(d => !attendanceRelatedTypes.includes(d.deductionType.name))

  // Debug logging after variable declarations
  console.log('Processing actual attendance deduction records from database...')
  console.log('All deductions found:', allDeductions.length)
  console.log('Attendance deductions found:', attendanceDeductions.length)
  console.log('Non-attendance deductions found:', nonAttendanceDeductions.length)

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

  // Check if payroll entries exist for this period (exclude archived)
  const existingPayrolls = await prisma.payrollEntry.groupBy({
    by: ['users_id'],
    where: { 
      users_id: { in: userIds }, 
      processedAt: { gte: periodStart, lte: periodEnd },
      status: { not: 'ARCHIVED' }
    },
    _sum: { netPay: true }
  })

  const releasedSet = new Set(
    (await prisma.payrollEntry.findMany({ 
      where: { 
        users_id: { in: userIds }, 
        processedAt: { gte: periodStart, lte: periodEnd }, 
        status: 'RELEASED' 
      }, 
      select: { users_id: true } 
    })).map(p => p.users_id)
  )

  // Calculate real-time earnings, attendance deductions, and work hours from attendance records
  const earningsMap = new Map()
  const attendanceDeductionsMap = new Map()
  const workHoursMap = new Map()
  
  for (const record of allAttendanceRecords) {
    const userId = record.users_id
    const user = users.find(u => u.users_id === userId)
    if (!user || !user.personnelType || !user.personnelType.basicSalary) return
    
    const basicSalary = Number(user.personnelType.basicSalary)
    let dayEarnings = 0
    let dayDeductions = 0
    let dayWorkHours = 0
    
    if (record.status === 'PRESENT') {
      if (record.timeIn) {
        const timeIn = new Date(record.timeIn)
        const timeOut = record.timeOut ? new Date(record.timeOut) : null
        dayEarnings = calculateEarnings(basicSalary, timeIn, timeOut)
        // Calculate actual work hours
        const endTime = timeOut || new Date()
        dayWorkHours = (endTime.getTime() - timeIn.getTime()) / (1000 * 60 * 60) // Convert to hours
      }
      dayDeductions = 0
    } else if (record.status === 'LATE') {
      if (record.timeIn) {
        const timeIn = new Date(record.timeIn)
        const timeOut = record.timeOut ? new Date(record.timeOut) : null
        dayEarnings = calculateEarnings(basicSalary, timeIn, timeOut)
        // Set expected time to 8:00 AM for the same date
        const expectedTime = new Date(record.date)
        expectedTime.setHours(8, 0, 0, 0)
        dayDeductions = await calculateLateDeduction(basicSalary, timeIn, expectedTime)
        // Calculate actual work hours
        const endTime = timeOut || new Date()
        dayWorkHours = (endTime.getTime() - timeIn.getTime()) / (1000 * 60 * 60) // Convert to hours
      } else {
        dayEarnings = 0
        dayDeductions = 0
        dayWorkHours = 0
      }
    } else if (record.status === 'PENDING') {
      // Pending status - no earnings or deductions until attendance is completed
      dayEarnings = 0
      dayDeductions = 0
      dayWorkHours = 0
    } else if (record.status === 'ABSENT') {
      dayEarnings = 0
      dayDeductions = await calculateAbsenceDeduction(basicSalary)
      dayWorkHours = 0
    } else if (record.status === 'PARTIAL') {
      if (record.timeIn) {
        const timeIn = new Date(record.timeIn)
        const timeOut = record.timeOut ? new Date(record.timeOut) : null
        dayEarnings = calculateEarnings(basicSalary, timeIn, timeOut)
        // Calculate partial deduction based on hours short
        const workHours = timeOut ? (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60) : 0
        dayDeductions = await calculatePartialDeduction(basicSalary, workHours)
        dayWorkHours = workHours
      }
    }
    
    // Accumulate earnings, deductions, and work hours
    const currentEarnings = earningsMap.get(userId) || 0
    const currentDeductions = attendanceDeductionsMap.get(userId) || 0
    const currentWorkHours = workHoursMap.get(userId) || 0
    earningsMap.set(userId, currentEarnings + dayEarnings)
    attendanceDeductionsMap.set(userId, currentDeductions + dayDeductions)
    workHoursMap.set(userId, currentWorkHours + dayWorkHours)
  }
  
  // Set 0 for users with no attendance records
  users.forEach(user => {
    if (!earningsMap.has(user.users_id)) {
      earningsMap.set(user.users_id, 0)
    }
    if (!attendanceDeductionsMap.has(user.users_id)) {
      attendanceDeductionsMap.set(user.users_id, 0)
    }
    if (!workHoursMap.has(user.users_id)) {
      workHoursMap.set(user.users_id, 0)
    }
  })
  
  // Group attendance deductions by user
  const attendanceDeductionsByUser = new Map()
  attendanceDeductions.forEach(deduction => {
    const userId = deduction.users_id
    if (!attendanceDeductionsByUser.has(userId)) {
      attendanceDeductionsByUser.set(userId, [])
    }
    attendanceDeductionsByUser.get(userId).push({
      id: deduction.deductions_id,
      amount: Number(deduction.amount),
      type: deduction.deductionType.name,
      description: deduction.deductionType.description,
      appliedAt: deduction.appliedAt,
      notes: deduction.notes
    })
  })

  // Group non-attendance deductions by user
  const nonAttendanceDeductionsByUser = new Map()
  nonAttendanceDeductions.forEach(deduction => {
    const userId = deduction.users_id
    if (!nonAttendanceDeductionsByUser.has(userId)) {
      nonAttendanceDeductionsByUser.set(userId, [])
    }
    nonAttendanceDeductionsByUser.get(userId).push({
      id: deduction.deductions_id,
      amount: Number(deduction.amount),
      type: deduction.deductionType.name,
      description: deduction.deductionType.description,
      appliedAt: deduction.appliedAt,
      notes: deduction.notes
    })
  })
  
  const actualAttendanceDeductionsMap = new Map() // Actual deduction records from database
  attendanceDeductionsByUser.forEach((userDeductions, userId) => {
    const totalAmount = userDeductions.reduce((sum: number, d: any) => sum + d.amount, 0)
    actualAttendanceDeductionsMap.set(userId, { total: totalAmount, details: userDeductions })
  })

  const nonAttendanceDeductionsMap = new Map()
  nonAttendanceDeductionsByUser.forEach((userDeductions, userId) => {
    const totalAmount = userDeductions.reduce((sum: number, d: any) => sum + d.amount, 0)
    nonAttendanceDeductionsMap.set(userId, { total: totalAmount, details: userDeductions })
  })
  
  const existingPayrollMap = new Map(existingPayrolls.map(p => [p.users_id, Number(p._sum.netPay || 0)]))

  // Calculate loan payments using monthlyPaymentPercent (consistent with personnel end)
  const loanPaymentsMap = new Map()
  loans.forEach(loan => {
    const loanAmount = Number(loan.amount)
    const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
    const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
    const biweeklyPayment = monthlyPayment / 2 // Convert to biweekly payment
    loanPaymentsMap.set(loan.users_id, (loanPaymentsMap.get(loan.users_id) || 0) + biweeklyPayment)
  })

  // Calculate real-time payroll for each user
  const rows = users.map(u => {
    const basicSalary = u.personnelType?.basicSalary ? Number(u.personnelType.basicSalary) : 0
    const biweeklyBasicSalary = basicSalary / 2 // Convert monthly to biweekly
    const attendanceDeductionData = actualAttendanceDeductionsMap.get(u.users_id) || { total: 0, details: [] }
    const nonAttendanceDeductionData = nonAttendanceDeductionsMap.get(u.users_id) || { total: 0, details: [] }
    const actualAttendanceDeductions = attendanceDeductionData.total // Use actual deduction records
    const nonAttendanceDeductions = nonAttendanceDeductionData.total
    const calculatedAttendanceDeductions = attendanceDeductionsMap.get(u.users_id) || 0 // Keep for reference
    const realTimeEarnings = earningsMap.get(u.users_id) || 0
    const realWorkHours = workHoursMap.get(u.users_id) || 0
    const loanPayments = loanPaymentsMap.get(u.users_id) || 0
    
    // Calculate overtime (if real-time earnings exceed biweekly basic salary)
    const overtimePay = Math.max(0, realTimeEarnings - biweeklyBasicSalary)
    
    // Calculate total deductions (actual attendance + non-attendance + loans)
    const totalDeductions = actualAttendanceDeductions + nonAttendanceDeductions + loanPayments
    
    // Calculate net pay (biweekly basic salary + overtime - total deductions)
    const grossPay = biweeklyBasicSalary + overtimePay
    const netPay = Math.max(0, grossPay - totalDeductions)

    return {
      users_id: u.users_id,
      name: u.name,
      email: u.email,
      totalHours: realWorkHours, // Now shows actual work hours
      totalSalary: netPay,
      released: releasedSet.has(u.users_id),
      // Additional breakdown for debugging
      breakdown: {
        biweeklyBasicSalary,
        realTimeEarnings,
        realWorkHours,
        overtimePay,
        attendanceDeductions: actualAttendanceDeductions, // Show actual deduction records
        nonAttendanceDeductions,
        loanPayments,
        grossPay,
        totalDeductions,
        netPay,
        deductionDetails: [...attendanceDeductionData.details, ...nonAttendanceDeductionData.details] // Combine all deduction details
      }
    }
  })

  // Debug logging for first user
  if (rows.length > 0) {
    console.log('First user breakdown:', {
      name: rows[0].name,
      attendanceDeductions: rows[0].breakdown?.attendanceDeductions,
      totalDeductions: rows[0].breakdown?.totalDeductions,
      deductionDetailsCount: rows[0].breakdown?.deductionDetails?.length
    })
  }

  // Get scheduled release time from file
  let scheduledRelease = null
  try {
    const fs = require('fs')
    const path = require('path')
    const scheduleFile = path.join(process.cwd(), 'payroll-schedule.json')
    
    if (fs.existsSync(scheduleFile)) {
      const scheduleData = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'))
      scheduledRelease = scheduleData.releaseAt
    }
  } catch (error) {
    console.error('Error reading schedule file:', error)
  }

  return NextResponse.json({ periodStart, periodEnd, rows, scheduledRelease })
  
  } catch (error) {
    console.error('Error in payroll summary API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load payroll summary',
        periodStart: null,
        periodEnd: null,
        rows: [],
        scheduledRelease: null
      }, 
      { status: 500 }
    )
  }
}



