import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLiveAttendanceRecords } from '@/lib/attendance-live'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Personnel breakdown API called')
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.error('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get userId
    let userId = session.user.id as string | undefined
    if (!userId && session.user.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { users_id: true }
      })
      userId = user?.users_id
    }
    if (!userId) {
      console.error('❌ User ID not found')
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 })
    }

    console.log('✅ User ID:', userId)

    // Get period from query params
    const searchParams = request.nextUrl.searchParams
    const periodStartStr = searchParams.get('periodStart')
    const periodEndStr = searchParams.get('periodEnd')

    if (!periodStartStr || !periodEndStr) {
      console.error('❌ Missing period parameters')
      return NextResponse.json({ error: 'Missing period parameters' }, { status: 400 })
    }

    const periodStart = new Date(periodStartStr)
    const periodEnd = new Date(periodEndStr)
    
    console.log('📅 Period:', { periodStart, periodEnd })
    
    // FIRST: Check if there's a released payroll with snapshot for this period
    const releasedPayroll = await prisma.payrollEntry.findFirst({
      where: {
        users_id: userId,
        periodStart: periodStart,
        periodEnd: periodEnd,
        status: 'RELEASED'
      },
      select: {
        breakdownSnapshot: true
      }
    })
    
    // If released payroll with snapshot exists, use it directly
    if (releasedPayroll?.breakdownSnapshot) {
      try {
        const snapshot = JSON.parse(releasedPayroll.breakdownSnapshot)
        console.log('✅ Using breakdownSnapshot from released payroll')
        
        // Return snapshot data directly
        return NextResponse.json({
          otherDeductions: snapshot.deductionDetails || [],
          attendanceRecords: snapshot.attendanceRecords || [],
          attendanceDetails: [],
          attendanceDeductionsTotal: snapshot.attendanceDeductions || 0,
          databaseDeductionsTotal: snapshot.databaseDeductions || 0,
          loans: [],
          unpaidLeaves: [],
          unpaidLeaveDeductionTotal: 0,
          unpaidLeaveDays: 0,
          totalDeductions: snapshot.totalDeductions || 0,
          totalLoanPayments: snapshot.loanPayments || 0,
          biweeklyBasicSalary: snapshot.periodSalary || 0,
          realTimeEarnings: 0,
          realWorkHours: snapshot.totalWorkHours || 0,
          overtimePay: 0,
          grossPay: snapshot.periodSalary || 0,
          netPay: snapshot.netPay || 0
        })
      } catch (e) {
        console.error('Failed to parse snapshot, falling back to calculation:', e)
      }
    }
    
    console.log('⚠️ No snapshot found, calculating breakdown live...')

    // Fetch mandatory deductions (same as admin logic)
    let mandatoryDeductions: any[] = []
    try {
      const types = await prisma.deductionType.findMany({
        where: { isMandatory: true, isActive: true }
      })
      mandatoryDeductions = types.map(t => ({
        type: t.name,
        amount: Number(t.amount),
        description: t.description || 'Mandatory deduction',
        isMandatory: true
      }))
      console.log('🔍 Fetched mandatory deductions:', mandatoryDeductions)
    } catch (e) {
      console.error('Failed to fetch mandatory deductions:', e)
    }

    // Get user with basic salary
    const user = await prisma.user.findUnique({ 
      where: { users_id: userId }, 
      select: { 
        personnelType: { 
          select: { basicSalary: true } 
        } 
      } 
    })
    const basicSalary = user?.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
    const biweeklyBasicSalary = basicSalary / 2

    // Get ALL deductions but separate attendance-related from non-attendance deductions
    const allDeductions = await prisma.deduction.findMany({
      where: { 
        users_id: userId, 
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

    // Check if we're before the cutoff time for TODAY
    const { getNowInPhilippines } = await import('@/lib/timezone')
    const { getTodayRangeInPhilippines } = await import('@/lib/timezone')
    const nowPH = getNowInPhilippines()
    const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
    
    // Get attendance settings to check cutoff
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const nowHH = nowPH.getHours().toString().padStart(2, '0')
    const nowMM = nowPH.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    
    const isBeforeCutoff = attendanceSettings?.timeOutEnd ? nowHHmm <= attendanceSettings.timeOutEnd : false
    
    // Separate attendance and non-attendance deductions (same logic as admin)
    const attendanceRelatedTypes = ['Late Arrival', 'Early Time-Out', 'Absence Deduction', 'Partial Attendance', 'Absent', 'Late', 'Tardiness']
    
    // Filter out TODAY's absence deductions if we're before cutoff
    const attendanceDeductions = allDeductions.filter(d => {
      if (!attendanceRelatedTypes.includes(d.deductionType.name)) return false
      
      // If this is an absence deduction for TODAY and we're before cutoff, exclude it
      if (d.deductionType.name === 'Absence Deduction' && isBeforeCutoff) {
        const deductionDate = new Date(d.appliedAt)
        const isToday = deductionDate >= startOfToday && deductionDate <= endOfToday
        if (isToday) {
          console.log('⚠️ Filtering out premature absence deduction (before cutoff)', d)
          return false // Exclude this deduction
        }
      }
      
      return true
    })
    
    const nonAttendanceDeductions = allDeductions.filter(d => !attendanceRelatedTypes.includes(d.deductionType.name))

    // Calculate attendance deductions from actual records
    const actualAttendanceDeductions = attendanceDeductions.reduce((sum, d) => sum + Number(d.amount), 0)
    const nonAttendanceDeductionsTotal = nonAttendanceDeductions.reduce((sum, d) => sum + Number(d.amount), 0)

    // SIMPLE SOLUTION: Use shared live attendance calculation
    // This ensures payroll uses the same cutoff-aware logic as admin/attendance
    const liveAttendanceRecords = await getLiveAttendanceRecords(
      userId,
      periodStart,
      periodEnd,
      basicSalary
    )

    // Calculate totals from live records
    let realTimeEarnings = 0
    let realWorkHours = 0
    let calculatedAttendanceDeductions = 0
    
    for (const record of liveAttendanceRecords) {
      realTimeEarnings += record.earnings
      realWorkHours += record.workHours
      calculatedAttendanceDeductions += record.deductions
    }

    // Get active loans
    const loans = await prisma.loan.findMany({
      where: {
        users_id: userId,
        status: 'ACTIVE',
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart }
      },
      select: {
        purpose: true,
        amount: true,
        balance: true,
        monthlyPaymentPercent: true,
        termMonths: true,
        status: true
      }
    })

    // Calculate loan payments (same logic as admin)
    const totalLoanPayments = loans.reduce((sum, loan) => {
      const loanAmount = Number(loan.amount)
      const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
      const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
      const biweeklyPayment = monthlyPayment / 2
      return sum + biweeklyPayment
    }, 0)

    // Calculate overtime (same logic as admin)
    const overtimePay = Math.max(0, realTimeEarnings - biweeklyBasicSalary)
    
    // Calculate total deductions (same logic as admin)
    const totalDeductions = actualAttendanceDeductions + nonAttendanceDeductionsTotal + totalLoanPayments
    
    // Calculate net pay (same logic as admin)
    const grossPay = biweeklyBasicSalary + overtimePay
    const netPay = Math.max(0, grossPay - totalDeductions)

    console.log('📊 Personnel breakdown (admin logic):', {
      biweeklyBasicSalary,
      realTimeEarnings,
      realWorkHours,
      overtimePay,
      attendanceDeductions: actualAttendanceDeductions,
      nonAttendanceDeductions: nonAttendanceDeductionsTotal,
      loanPayments: totalLoanPayments,
      totalDeductions,
      grossPay,
      netPay
    })
    
    console.log('📋 Other deductions details:', nonAttendanceDeductions.map(d => ({
      name: d.deductionType.name,
      description: d.deductionType.description,
      amount: Number(d.amount)
    })))

    // Build comprehensive otherDeductions list (same logic as admin)
    const mandatoryTypeNames = new Set(mandatoryDeductions.map((md: any) => md.type))
    
    const otherDeductionsResponse = nonAttendanceDeductions.map(d => ({
      name: d.deductionType.name,
      amount: Number(d.amount),
      appliedAt: d.appliedAt,
      description: d.deductionType.description || '-',
      isMandatory: mandatoryTypeNames.has(d.deductionType.name)
    }))
    
    // Add mandatory deductions that aren't already in the list
    mandatoryDeductions.forEach((md: any) => {
      const exists = otherDeductionsResponse.find((d: any) => d.name === md.type)
      if (!exists) {
        otherDeductionsResponse.push({
          name: md.type,
          amount: md.amount,
          appliedAt: new Date(),
          description: md.description,
          isMandatory: true
        })
      }
    })
    
    console.log('🎯 Final otherDeductions with mandatory flags:', otherDeductionsResponse)

    // Build attendance records for display (with live status and deductions)
    const attendanceRecordsForDisplay = liveAttendanceRecords.map(record => ({
      date: record.date.toISOString(),
      status: record.status,
      timeIn: record.timeIn?.toISOString() || null,
      timeOut: record.timeOut?.toISOString() || null,
      workHours: record.workHours,
      earnings: record.earnings,
      deductions: record.deductions
    }))
    
    console.log('📋 Live attendance records for display:', attendanceRecordsForDisplay)

    return NextResponse.json({
      otherDeductions: otherDeductionsResponse,
      // Use live attendance records instead of database deductions
      attendanceRecords: attendanceRecordsForDisplay,
      attendanceDetails: attendanceDeductions.map(d => ({
        date: d.appliedAt,
        type: d.deductionType.name,
        amount: Number(d.amount)
      })),
      // Use calculated deductions from live records
      attendanceDeductionsTotal: calculatedAttendanceDeductions,
      databaseDeductionsTotal: nonAttendanceDeductionsTotal,
      loans: loans.map(l => ({
        purpose: l.purpose,
        amount: Number(l.amount),
        monthlyPaymentPercent: Number(l.monthlyPaymentPercent),
        status: l.status
      })),
      unpaidLeaves: [],
      unpaidLeaveDeductionTotal: 0,
      unpaidLeaveDays: 0,
      // Use calculated deductions from live records
      totalDeductions: calculatedAttendanceDeductions + nonAttendanceDeductionsTotal + totalLoanPayments,
      totalLoanPayments,
      // Additional breakdown matching admin response
      biweeklyBasicSalary,
      realTimeEarnings,
      realWorkHours,
      overtimePay,
      grossPay,
      // Recalculate netPay with live deductions
      netPay: Math.max(0, grossPay - (calculatedAttendanceDeductions + nonAttendanceDeductionsTotal + totalLoanPayments))
    })

  } catch (error) {
    console.error('❌ Error fetching breakdown:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Failed to fetch breakdown',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
