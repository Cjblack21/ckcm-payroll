import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Function to get current biweekly period (same as admin)
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

export async function GET(request: NextRequest) {
  try {
    console.log('=== PERSONNEL PAYROLL API CALLED ===')
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const session = await getServerSession(authOptions)
    console.log('Session data:', JSON.stringify(session, null, 2))
    
    if (!session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    
    if (!session.user) {
      console.log('❌ No user in session')
      return NextResponse.json({ error: 'No user in session' }, { status: 401 })
    }
    
    // Resolve userId from session
    let userId = session.user.id as string | undefined
    if (!userId && session.user.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { users_id: true }
      })
      userId = user?.users_id
    }
    if (!userId) {
      console.log('❌ No user ID found via session or email lookup')
      return NextResponse.json({ error: 'No user ID found in session' }, { status: 401 })
    }

    console.log('User ID:', userId)

    // Use attendance settings period (same as admin)
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    
    if (!attendanceSettings?.periodStart || !attendanceSettings?.periodEnd) {
      return NextResponse.json({ error: 'No attendance period configured' }, { status: 400 })
    }
    
    const periodStart = attendanceSettings.periodStart
    const periodEnd = attendanceSettings.periodEnd
    
    console.log('Personnel payroll period (from attendance settings):', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    })

    // Get most recent RELEASED (not ARCHIVED) payroll
    // When admin generates new payroll, old one becomes ARCHIVED and personnel should see nothing
    console.log(`Getting most recent RELEASED (non-archived) payroll for user: ${userId}`)
    
    let currentPayroll = await prisma.payrollEntry.findFirst({
      where: { 
        users_id: userId,
        status: 'RELEASED',
        // Exclude archived payrolls
        NOT: {
          status: 'ARCHIVED'
        }
      },
      orderBy: { releasedAt: 'desc' },
      select: {
        payroll_entries_id: true,
        users_id: true,
        periodStart: true,
        periodEnd: true,
        basicSalary: true,
        overtime: true,
        deductions: true,
        netPay: true,
        status: true,
        releasedAt: true,
        breakdownSnapshot: true, // INCLUDE SNAPSHOT
        user: {
          select: {
            name: true,
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      }
    })
    
    console.log(`Found RELEASED (non-archived) payroll:`, currentPayroll ? 'YES' : 'NO')
    
    if (currentPayroll) {
      console.log(`Payroll details:`, {
        id: currentPayroll.payroll_entries_id,
        status: currentPayroll.status,
        period: `${currentPayroll.periodStart} to ${currentPayroll.periodEnd}`,
        releasedAt: currentPayroll.releasedAt
      })
    }
    
    // Fallback: Try by email if userId didn't work
    if (!currentPayroll && session.user.email) {
      console.log(`Trying email fallback: ${session.user.email}`)
      currentPayroll = await prisma.payrollEntry.findFirst({
        where: { 
          status: 'RELEASED',
          NOT: {
            status: 'ARCHIVED'
          },
          user: { 
            email: session.user.email 
          } 
        },
        orderBy: { releasedAt: 'desc' },
        select: {
          payroll_entries_id: true,
          users_id: true,
          periodStart: true,
          periodEnd: true,
          basicSalary: true,
          overtime: true,
          deductions: true,
          netPay: true,
          status: true,
          releasedAt: true,
          breakdownSnapshot: true, // INCLUDE SNAPSHOT
          user: {
            select: {
              name: true,
              email: true,
              personnelType: {
                select: {
                  name: true,
                  basicSalary: true
                }
              }
            }
          }
        }
      })
      console.log(`Found RELEASED (non-archived) payroll by email:`, currentPayroll ? 'YES' : 'NO')
    }
    
    console.log('Current payroll found:', currentPayroll ? 'Yes' : 'No')
    if (currentPayroll) {
      console.log('Current payroll details:', {
        id: currentPayroll.payroll_entries_id,
        status: currentPayroll.status,
        netPay: currentPayroll.netPay,
        periodStart: currentPayroll.periodStart,
        periodEnd: currentPayroll.periodEnd
      })
    }

    // Determine effective period to display and factor calculations
    const effectiveStart = currentPayroll?.periodStart ?? periodStart
    const effectiveEndRaw = currentPayroll?.periodEnd ?? periodEnd  // Use full periodEnd, not capped
    const effectiveEnd = new Date(effectiveEndRaw)
    effectiveEnd.setHours(23,59,59,999)

    // Get archived payroll entries (older than effective period)
    const archivedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        users_id: userId,
        periodEnd: { lt: effectiveStart }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      },
      orderBy: {
        periodEnd: 'desc'
      }
    })
    
    console.log(`Found ${archivedPayrolls.length} archived payroll entries`)

    // Get user's deductions and loans for current period
    const deductions = await prisma.deduction.findMany({
      where: {
        users_id: userId,
        appliedAt: {
          gte: periodStart,
          lte: periodEnd
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
    console.log(`Found ${deductions.length} deductions for current period`)

    // Separate attendance-related vs other deductions
    const isAttendanceType = (name: string) => (
      name.includes('Late') || name.includes('Absent') || name.includes('Early')
    )
    const otherDeductions = deductions.filter(d => !isAttendanceType(d.deductionType.name))

    // Compute real-time attendance deductions similar to admin logic
    const attendanceSettingsForCalc = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettingsForCalc?.timeInEnd || '09:30'
    // Working days in period (exclude Sundays), use full period end
    let workingDaysInPeriod = 0
    {
      const cur = new Date(periodStart)
      // Cap working days calculation to today to avoid counting future dates
      const todayEOD = new Date()
      todayEOD.setHours(23, 59, 59, 999)
      const calcEnd = periodEnd > todayEOD ? todayEOD : periodEnd
      while (cur <= calcEnd) {
        if (cur.getDay() !== 0) workingDaysInPeriod++
        cur.setDate(cur.getDate() + 1)
      }
      if (workingDaysInPeriod === 0) workingDaysInPeriod = 22
    }
    const user = await prisma.user.findUnique({ where: { users_id: userId }, select: { personnelType: { select: { basicSalary: true } } } })
    const basicSalary = user?.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0

    // Only fetch attendance up to today, not future dates
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const attendanceEndDate = effectiveEnd > today ? today : effectiveEnd
    
    const attendanceRecords = await prisma.attendance.findMany({
      where: { users_id: userId, date: { gte: effectiveStart, lte: attendanceEndDate } },
      orderBy: { date: 'asc' }
    })
    let attendanceDeductionsTotal = 0
    const attendanceDetails: any[] = []
    for (const rec of attendanceRecords) {
      let deduction = 0
      
      if (rec.status === 'LATE' && rec.timeIn) {
        const timeIn = new Date(rec.timeIn)
        const expected = new Date(rec.date)
        const [h, m] = timeInEnd.split(':').map(Number)
        const adjM = m + 1
        if (adjM >= 60) {
          expected.setHours(h + 1, adjM - 60, 0, 0)
        } else {
          expected.setHours(h, adjM, 0, 0)
        }
        const perSecond = (basicSalary / workingDaysInPeriod / 8 / 60 / 60)
        const secondsLate = Math.max(0, (timeIn.getTime() - expected.getTime()) / 1000)
        const daily = basicSalary / workingDaysInPeriod
        deduction = Math.min(secondsLate * perSecond, daily * 0.5)
        attendanceDeductionsTotal += deduction
      } else if (rec.status === 'ABSENT') {
        deduction = basicSalary / workingDaysInPeriod
        attendanceDeductionsTotal += deduction
      } else if (rec.status === 'PARTIAL') {
        // If partial with timeIn/timeOut, approximate hours short
        let hoursShort = 0
        if (rec.timeIn && rec.timeOut) {
          const timeIn = new Date(rec.timeIn)
          const timeOut = new Date(rec.timeOut)
          const hoursWorked = Math.max(0, (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60))
          hoursShort = Math.max(0, 8 - hoursWorked)
        } else {
          hoursShort = 8
        }
        const hourlyRate = (basicSalary / workingDaysInPeriod) / 8
        deduction = hoursShort * hourlyRate
        attendanceDeductionsTotal += deduction
      }
      
      // Calculate work hours
      let workHours = 0
      if (rec.timeIn && rec.timeOut) {
        workHours = (new Date(rec.timeOut).getTime() - new Date(rec.timeIn).getTime()) / (1000 * 60 * 60)
      }
      
      // Add complete attendance detail
      attendanceDetails.push({
        date: rec.date,
        status: rec.status,
        timeIn: rec.timeIn,
        timeOut: rec.timeOut,
        workHours,
        deduction
      })
    }

    const loans = await prisma.loan.findMany({
      where: {
        users_id: userId,
        status: 'ACTIVE'
      }
    })

    // Calculate totals only for breakdown display; this does not surface pending payroll
    const totalDatabaseDeductions = otherDeductions.reduce((sum, deduction) => sum + Number(deduction.amount), 0)
    console.log('Database deductions total:', totalDatabaseDeductions)

    const periodDays = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const factor = periodDays <= 16 ? 0.5 : 1.0
    const totalLoanPayments = loans.reduce((sum, loan) => {
      const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      return sum + (monthlyPayment * factor)
    }, 0)

    // Do NOT synthesize pending payroll for personnel view; if not released, show none
    
    console.log('Total loan payments calculated:', totalLoanPayments)
    console.log('Active loans found:', loans.length)

    const serializePayroll = (p: any) => {
      if (!p) return null
      
      // Parse breakdown snapshot if available
      let breakdownData = null
      if (p.breakdownSnapshot) {
        try {
          // Handle both string and object
          breakdownData = typeof p.breakdownSnapshot === 'string' 
            ? JSON.parse(p.breakdownSnapshot) 
            : p.breakdownSnapshot
          console.log('✅ SNAPSHOT PARSED:', JSON.stringify(breakdownData, null, 2))
        } catch (e) {
          console.error('Failed to parse breakdown snapshot:', e)
        }
      } else {
        console.log('⚠️ NO SNAPSHOT FOUND for payroll:', p.payroll_entries_id)
      }
      
      // DIRECT COPY - Return snapshot as-is
      if (breakdownData) {
        console.log('🔥 RETURNING EXACT SNAPSHOT:', breakdownData)
        return {
          payroll_entries_id: p.payroll_entries_id,
          users_id: p.users_id,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          basicSalary: Number(p.basicSalary),
          overtime: Number(p.overtime),
          deductions: Number(p.deductions),
          netPay: Number(p.netPay),
          status: p.status,
          releasedAt: p.releasedAt,
          breakdownSnapshot: breakdownData, // EXACT COPY - NO MODIFICATION
          user: p.user ? {
            name: p.user.name,
            email: p.user.email,
            personnelType: p.user.personnelType ? {
              name: p.user.personnelType.name,
              basicSalary: Number(p.user.personnelType.basicSalary)
            } : null
          } : null
        }
      }
      
      // Fallback for payroll without snapshot (shouldn't happen for released payroll)
      return {
        payroll_entries_id: p.payroll_entries_id,
        users_id: p.users_id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        basicSalary: Number(p.basicSalary),
        overtime: Number(p.overtime),
        deductions: Number(p.deductions),
        netPay: Number(p.netPay),
        status: p.status,
        releasedAt: p.releasedAt,
        breakdownSnapshot: breakdownData,
        user: p.user ? {
          name: p.user.name,
          email: p.user.email,
          personnelType: p.user.personnelType ? {
            name: p.user.personnelType.name,
            basicSalary: Number(p.user.personnelType.basicSalary)
          } : null
        } : null
      }
    }

    // Fetch mandatory deductions to mark them properly
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
    } catch (e) {
      console.error('Failed to fetch mandatory deductions:', e)
    }

    const mandatoryTypeNames = new Set(mandatoryDeductions.map((md: any) => md.type))
    
    const serializedOtherDeductions = otherDeductions.map(d => ({
      name: d.deductionType.name,
      amount: Number(d.amount),
      appliedAt: d.appliedAt,
      description: d.deductionType.description || '-',
      isMandatory: mandatoryTypeNames.has(d.deductionType.name)
    }))
    
    // Add mandatory deductions that aren't already in the list
    mandatoryDeductions.forEach((md: any) => {
      const exists = serializedOtherDeductions.find((d: any) => d.name === md.type)
      if (!exists) {
        serializedOtherDeductions.push({
          name: md.type,
          amount: md.amount,
          appliedAt: new Date(),
          description: md.description,
          isMandatory: true
        })
      }
    })

    const serializedLoans = loans.map(l => ({
      purpose: l.purpose,
      amount: Number(l.amount),
      monthlyPaymentPercent: Number(l.monthlyPaymentPercent),
      status: l.status
    }))

    // Get scheduled release time from file (same source as admin)
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

    // If current payroll has snapshot, use snapshot breakdown data
    let breakdownResponse = {
      otherDeductions: serializedOtherDeductions,
      attendanceDetails: attendanceDetails.map(a => ({ ...a, date: a.date })),
      attendanceDeductionsTotal,
      databaseDeductionsTotal: totalDatabaseDeductions,
      loans: serializedLoans,
      unpaidLeaves: [],
      unpaidLeaveDeductionTotal: 0,
      unpaidLeaveDays: 0,
      totalDeductions: totalDatabaseDeductions + attendanceDeductionsTotal + totalLoanPayments,
      totalLoanPayments
    }
    
    // Override with snapshot data if available (released payroll)
    if (currentPayroll?.breakdownSnapshot) {
      try {
        const snapshot = JSON.parse(currentPayroll.breakdownSnapshot)
        console.log('✅ Using snapshot breakdown data for personnel view')
        breakdownResponse = {
          otherDeductions: snapshot.deductionDetails || serializedOtherDeductions,
          attendanceDetails: snapshot.attendanceRecords || attendanceDetails.map(a => ({ ...a, date: a.date })),
          attendanceDeductionsTotal: snapshot.attendanceDeductions || attendanceDeductionsTotal,
          databaseDeductionsTotal: snapshot.databaseDeductions || totalDatabaseDeductions,
          loans: serializedLoans,
          unpaidLeaves: [],
          unpaidLeaveDeductionTotal: 0,
          unpaidLeaveDays: 0,
          totalDeductions: snapshot.totalDeductions || (totalDatabaseDeductions + attendanceDeductionsTotal + totalLoanPayments),
          totalLoanPayments: snapshot.loanPayments || totalLoanPayments
        }
      } catch (e) {
        console.error('Failed to use snapshot breakdown:', e)
      }
    }

    const responseData = {
      currentPayroll: serializePayroll(currentPayroll),
      archivedPayrolls: archivedPayrolls.map(serializePayroll),
      periodInfo: {
        current: {
          start: periodStart.toISOString(),  // Serialize to ISO string
          end: periodEnd.toISOString(),      // Serialize to ISO string
          releaseTime: attendanceSettings?.payrollReleaseTime || '17:00',
          scheduledRelease: scheduledRelease
        }
      },
      breakdown: breakdownResponse
    }
    
    console.log('Response data prepared:', {
      hasCurrentPayroll: !!currentPayroll,
      archivedCount: archivedPayrolls.length,
      deductionsCount: deductions.length,
      loansCount: loans.length
    })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error fetching personnel payroll:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Return a safe default payload with 200 to avoid client fetch failure while surfacing error details
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    end.setHours(23,59,59,999)
    return NextResponse.json({
      currentPayroll: null,
      archivedPayrolls: [],
      periodInfo: { current: { start, end, releaseTime: '17:00' } },
      breakdown: {
        otherDeductions: [],
        attendanceDetails: [],
        attendanceDeductionsTotal: 0,
        databaseDeductionsTotal: 0,
        loans: [],
        unpaidLeaves: [],
        unpaidLeaveDeductionTotal: 0,
        unpaidLeaveDays: 0,
        totalDeductions: 0,
        totalLoanPayments: 0
      },
      error: 'Failed to fetch payroll data',
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

