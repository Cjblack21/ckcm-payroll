import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Determine period aligned with attendance settings (same approach as admin payroll)
    let periodStart: Date
    let periodEnd: Date
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
      periodStart = new Date(attendanceSettings.periodStart)
      periodEnd = new Date(attendanceSettings.periodEnd)
      periodStart.setHours(0, 0, 0, 0)
      periodEnd.setHours(23, 59, 59, 999)
      console.log('Personnel payroll period aligned with attendance settings:', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      })
    } else {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth()
      periodStart = new Date(y, m, 1)
      periodStart.setHours(0, 0, 0, 0)
      periodEnd = new Date(y, m + 1, 0)
      periodEnd.setHours(23, 59, 59, 999)
      console.log('Personnel payroll period fallback to current month:', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      })
    }

    // Cap the effective end to end-of-today to avoid future dates
    const todayEOD = new Date();
    todayEOD.setHours(23, 59, 59, 999)
    const cappedEnd = periodEnd > todayEOD ? todayEOD : periodEnd

    // Always prefer the user's latest RELEASED entry first (regardless of period)
    let currentPayroll = await prisma.payrollEntry.findFirst({
      where: { users_id: userId, status: 'RELEASED' },
      orderBy: { releasedAt: 'desc' },
      include: {
        user: { select: { name: true, email: true, personnelType: { select: { name: true, basicSalary: true } } } }
      }
    })
    if (!currentPayroll && session.user.email) {
      currentPayroll = await prisma.payrollEntry.findFirst({
        where: { status: 'RELEASED', user: { is: { email: session.user.email } } },
        orderBy: { releasedAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, personnelType: { select: { name: true, basicSalary: true } } } }
        }
      })
    }

    // If none, try RELEASED overlapping the settings window
    if (!currentPayroll) currentPayroll = await prisma.payrollEntry.findFirst({
      where: {
        users_id: userId,
        status: 'RELEASED',
        AND: [
          { periodStart: { lte: periodEnd } },
          { periodEnd: { gte: periodStart } },
        ],
      },
      orderBy: { releasedAt: 'desc' },
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
      }
    })

    // Remove non-released fallbacks: personnel should only see RELEASED payroll
    // Keep only RELEASED search by userId and by email relation as fallback
    if (!currentPayroll && session.user.email) {
      currentPayroll = await prisma.payrollEntry.findFirst({
        where: {
          status: 'RELEASED',
          AND: [ { periodStart: { lte: periodEnd } }, { periodEnd: { gte: periodStart } } ],
          user: { is: { email: session.user.email } },
        },
        orderBy: { releasedAt: 'desc' },
        include: {
          user: { select: { name: true, email: true, personnelType: { select: { name: true, basicSalary: true } } } }
        }
      })
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
    const effectiveEndRaw = currentPayroll?.periodEnd ?? cappedEnd
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
    // Working days in period (exclude Sundays), use previously capped end-of-period
    let workingDaysInPeriod = 0
    {
      const cur = new Date(periodStart)
      while (cur <= cappedEnd) {
        if (cur.getDay() !== 0) workingDaysInPeriod++
        cur.setDate(cur.getDate() + 1)
      }
      if (workingDaysInPeriod === 0) workingDaysInPeriod = 22
    }
    const user = await prisma.user.findUnique({ where: { users_id: userId }, select: { personnelType: { select: { basicSalary: true } } } })
    const basicSalary = user?.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0

    const attendanceRecords = await prisma.attendance.findMany({
      where: { users_id: userId, date: { gte: effectiveStart, lte: effectiveEnd } },
      orderBy: { date: 'asc' }
    })
    let attendanceDeductionsTotal = 0
    const attendanceDetails: { date: Date, type: string, amount: number }[] = []
    for (const rec of attendanceRecords) {
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
        const amount = Math.min(secondsLate * perSecond, daily * 0.5)
        if (amount > 0) {
          attendanceDeductionsTotal += amount
          attendanceDetails.push({ date: rec.date, type: 'Late', amount })
        }
      } else if (rec.status === 'ABSENT') {
        const amount = basicSalary / workingDaysInPeriod
        attendanceDeductionsTotal += amount
        attendanceDetails.push({ date: rec.date, type: 'Absent', amount })
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
        const amount = hoursShort * hourlyRate
        if (amount > 0) {
          attendanceDeductionsTotal += amount
          attendanceDetails.push({ date: rec.date, type: 'Partial', amount })
        }
      }
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

    const serializePayroll = (p: any) => p ? {
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
      user: p.user ? {
        name: p.user.name,
        email: p.user.email,
        personnelType: p.user.personnelType ? {
          name: p.user.personnelType.name,
          basicSalary: Number(p.user.personnelType.basicSalary)
        } : null
      } : null
    } : null

    const serializedOtherDeductions = otherDeductions.map(d => ({
      name: d.deductionType.name,
      amount: Number(d.amount),
      appliedAt: d.appliedAt
    }))

    const serializedLoans = loans.map(l => ({
      purpose: l.purpose,
      amount: Number(l.amount),
      monthlyPaymentPercent: Number(l.monthlyPaymentPercent),
      status: l.status
    }))

    const responseData = {
      currentPayroll: serializePayroll(currentPayroll),
      archivedPayrolls: archivedPayrolls.map(serializePayroll),
      periodInfo: {
        current: {
          start: effectiveStart,
          end: effectiveEnd
        }
      },
      breakdown: {
        otherDeductions: serializedOtherDeductions,
        attendanceDetails: attendanceDetails.map(a => ({ ...a, date: a.date })),
        attendanceDeductionsTotal,
        databaseDeductionsTotal: totalDatabaseDeductions,
        loans: serializedLoans,
        totalDeductions: totalDatabaseDeductions + attendanceDeductionsTotal + totalLoanPayments,
        totalLoanPayments
      }
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
      periodInfo: { current: { start, end } },
      breakdown: {
        otherDeductions: [],
        attendanceDetails: [],
        attendanceDeductionsTotal: 0,
        databaseDeductionsTotal: 0,
        loans: [],
        totalDeductions: 0,
        totalLoanPayments: 0
      },
      error: 'Failed to fetch payroll data',
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

