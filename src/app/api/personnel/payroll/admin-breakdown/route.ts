import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNowInPhilippines, getTodayRangeInPhilippines } from '@/lib/timezone'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin breakdown API called for personnel')
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.error('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get userId
    let userId = session.user.id as string | undefined
    if (!userId && session.user.email) {
      console.log('🔍 Looking up user by email:', session.user.email)
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
    console.log('🔍 Fetching payroll data directly from API...')
    
    // Call the admin payroll summary API directly (bypasses admin role check by using API route)
    const summaryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/payroll/summary`, {
      headers: {
        // Include session cookie to maintain authentication
        cookie: request.headers.get('cookie') || ''
      }
    })
    
    if (!summaryResponse.ok) {
      console.error('❌ Failed to fetch payroll summary from API:', summaryResponse.status)
      // Fallback: fetch directly from database
      console.log('📦 Fetching from database directly...')
      
      const userWithPayroll = await prisma.user.findUnique({
        where: { users_id: userId },
        include: {
          personnelType: {
            select: {
              name: true,
              basicSalary: true
            }
          }
        }
      })
      
      if (!userWithPayroll) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      // Fetch mandatory deductions
      const mandatoryDeductionTypes = await prisma.deductionType.findMany({
        where: { isMandatory: true, isActive: true }
      })
      
      // Get current period deductions
      const now = new Date()
      const year = now.getFullYear()
      const firstMonday = new Date(year, 0, 1)
      const dayOfWeek = firstMonday.getDay()
      const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
      firstMonday.setDate(firstMonday.getDate() + daysToAdd)
      const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
      const biweeklyPeriod = Math.floor(daysSinceFirstMonday / 14)
      const periodStart = new Date(firstMonday)
      periodStart.setDate(periodStart.getDate() + (biweeklyPeriod * 14))
      const periodEnd = new Date(periodStart)
      periodEnd.setDate(periodEnd.getDate() + 13)
      periodEnd.setHours(23, 59, 59, 999)
      
      const deductions = await prisma.deduction.findMany({
        where: {
          users_id: userId,
          appliedAt: { gte: periodStart, lte: periodEnd }
        },
        include: {
          deductionType: true
        }
      })
      
      // Build deduction details with isMandatory flag
      const mandatoryTypeNames = new Set(mandatoryDeductionTypes.map(dt => dt.name))
      
      const deductionDetails = [
        ...mandatoryDeductionTypes.map(dt => ({
          type: dt.name,
          amount: Number(dt.amount),
          description: dt.description || 'Mandatory deduction',
          isMandatory: true
        })),
        ...deductions
          .filter(d => !mandatoryTypeNames.has(d.deductionType.name)) // Avoid duplicates
          .map(d => ({
            type: d.deductionType.name,
            amount: Number(d.amount),
            description: d.deductionType.description || '-',
            isMandatory: d.deductionType.isMandatory || false
          }))
      ]
      
      return NextResponse.json({
        userId: userWithPayroll.users_id,
        name: userWithPayroll.name,
        email: userWithPayroll.email,
        personnelType: userWithPayroll.personnelType?.name || 'N/A',
        basicSalary: Number(userWithPayroll.personnelType?.basicSalary || 0),
        biweeklyBasicSalary: Number(userWithPayroll.personnelType?.basicSalary || 0) / 2,
        attendanceDeductions: 0,
        loanPayments: 0,
        databaseDeductions: deductions.reduce((sum, d) => sum + Number(d.amount), 0),
        totalWorkHours: 0,
        netSalary: 0,
        status: 'Pending',
        attendanceRecords: [],
        loanDetails: [],
        deductionDetails
      })
    }
    
    const summaryData = await summaryResponse.json()
    
    console.log('✅ Payroll summary received, entries:', summaryData.rows?.length)
    
    // Find this user's entry
    const userEntry = summaryData.rows?.find((entry: any) => entry.users_id === userId)
    
    if (!userEntry) {
      console.error('❌ No payroll entry found for user:', userId)
      return NextResponse.json({ error: 'No payroll entry found for this user' }, { status: 404 })
    }

    console.log('📊 Admin breakdown for personnel:', {
      userId,
      name: userEntry.name,
      deductionDetailsCount: userEntry.breakdown?.deductionDetails?.length
    })

    // Fetch live attendance records from the shared getLiveAttendanceRecords
    // Get attendance settings to determine period
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    if (!attendanceSettings?.periodStartDate || !attendanceSettings?.periodEndDate) {
      console.error('❌ Attendance settings not configured')
      return NextResponse.json({ error: 'Attendance settings not configured' }, { status: 500 })
    }
    
    const periodStart = new Date(attendanceSettings.periodStartDate)
    const periodEnd = new Date(attendanceSettings.periodEndDate)
    periodEnd.setHours(23, 59, 59, 999)
    
    // Only fetch attendance up to today, not future dates
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const attendanceEndDate = periodEnd > today ? today : periodEnd
    
    // Fetch actual attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: { users_id: userId, date: { gte: periodStart, lte: attendanceEndDate } },
      orderBy: { date: 'asc' }
    })
    
    // Get user's basic salary for deduction calculations
    const user = await prisma.user.findUnique({ 
      where: { users_id: userId }, 
      select: { personnelType: { select: { basicSalary: true } } } 
    })
    const basicSalary = user?.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
    
    // Calculate working days in period (same logic as personnel payroll route)
    const timeInEnd = attendanceSettings.timeInEnd || '09:30'
    let workingDaysInPeriod = 0
    {
      const cur = new Date(periodStart)
      const todayEOD = new Date()
      todayEOD.setHours(23, 59, 59, 999)
      const calcEnd = periodEnd > todayEOD ? todayEOD : periodEnd
      while (cur <= calcEnd) {
        if (cur.getDay() !== 0) workingDaysInPeriod++
        cur.setDate(cur.getDate() + 1)
      }
      if (workingDaysInPeriod === 0) workingDaysInPeriod = 22
    }
    
    // Get current time and today's date range for cutoff check
    const nowPH = getNowInPhilippines()
    const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
    const timeOutEnd = attendanceSettings.timeOutEnd || '17:00'
    const nowHH = nowPH.getHours().toString().padStart(2, '0')
    const nowMM = nowPH.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    const isBeforeCutoff = nowHHmm <= timeOutEnd
    
    // Calculate deductions for each attendance record
    const formattedAttendanceRecords = attendanceRecords.map(rec => {
      let deduction = 0
      
      // Check if this record is for today
      const recordDate = new Date(rec.date)
      const isToday = recordDate >= startOfToday && recordDate <= endOfToday
      
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
      } else if (rec.status === 'ABSENT') {
        // Only apply absence deduction if NOT today OR if past cutoff
        if (!isToday || !isBeforeCutoff) {
          deduction = basicSalary / workingDaysInPeriod
        }
      } else if (rec.status === 'PARTIAL') {
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
      }
      
      // Calculate work hours
      let workHours = 0
      if (rec.timeIn && rec.timeOut) {
        workHours = (new Date(rec.timeOut).getTime() - new Date(rec.timeIn).getTime()) / (1000 * 60 * 60)
      }
      
      return {
        date: rec.date,
        status: rec.status,
        timeIn: rec.timeIn,
        timeOut: rec.timeOut,
        workHours,
        deductions: deduction
      }
    })
    
    // Fetch loan details
    const loans = await prisma.loan.findMany({
      where: {
        users_id: userId,
        status: 'ACTIVE'
      }
    })
    
    const periodDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const factor = periodDays <= 16 ? 0.5 : 1.0
    
    const loanDetails = loans.map(loan => {
      const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      const payment = monthlyPayment * factor
      return {
        purpose: loan.purpose,
        payment,
        balance: Number(loan.balance)
      }
    })

    // Return the exact breakdown that admin sees
    return NextResponse.json({
      userId: userEntry.users_id,
      name: userEntry.name,
      email: userEntry.email,
      personnelType: 'Personnel',
      basicSalary: Number(userEntry.breakdown?.biweeklyBasicSalary || 0) * 2,
      biweeklyBasicSalary: Number(userEntry.breakdown?.biweeklyBasicSalary || 0),
      attendanceDeductions: Number(userEntry.breakdown?.attendanceDeductions || 0),
      loanPayments: Number(userEntry.breakdown?.loanPayments || 0),
      databaseDeductions: Number(userEntry.breakdown?.nonAttendanceDeductions || 0),
      totalWorkHours: Number(userEntry.totalHours || 0),
      netSalary: Number(userEntry.totalSalary || 0),
      status: userEntry.released ? 'Released' : 'Pending',
      // Full breakdown details with live attendance
      attendanceRecords: formattedAttendanceRecords,
      loanDetails,
      deductionDetails: userEntry.breakdown?.deductionDetails || []
    })

  } catch (error) {
    console.error('❌ Error fetching admin breakdown for personnel:', error)
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
