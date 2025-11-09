import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'PERSONNEL') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's basic salary for calculations
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

    const monthlyBasicSalary = user?.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
    const dailySalary = monthlyBasicSalary / 22
    const perSecondRate = dailySalary / 8 / 60 / 60

    // Get attendance settings for time windows
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '08:02'
    const timeOutStart = attendanceSettings?.timeOutStart || '17:00'
    const periodStart = attendanceSettings?.periodStart || new Date()
    const periodEnd = attendanceSettings?.periodEnd || new Date()

    // Get attendance records for current period
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        users_id: userId,
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      select: {
        date: true,
        timeIn: true,
        timeOut: true,
        status: true
      }
    })

    // Recalculate attendance deductions
    console.log('🔍 Personnel Payroll Details - Recalculating attendance deductions')
    console.log('📊 User:', userId, 'Basic Salary:', monthlyBasicSalary, 'Per Second Rate:', perSecondRate)
    console.log('📅 Period:', periodStart, 'to', periodEnd)
    console.log('📋 Attendance Records:', attendanceRecords.length)
    
    const attendanceDeductions: any[] = []
    attendanceRecords.forEach(record => {
      if (record.status === 'ABSENT') {
        attendanceDeductions.push({
          type: 'Absence Deduction',
          amount: dailySalary,
          isMandatory: false
        })
        console.log('❌ ABSENT:', record.date, '- Deduction:', dailySalary)
      } else if (record.status === 'LATE' && record.timeIn) {
        const timeIn = new Date(record.timeIn)
        const expected = new Date(record.date)
        const [h, m] = timeInEnd.split(':').map(Number)
        expected.setHours(h, m + 1, 0, 0)
        const secondsLate = Math.max(0, (timeIn.getTime() - expected.getTime()) / 1000)
        const lateAmount = secondsLate * perSecondRate

        if (lateAmount > 0) {
          attendanceDeductions.push({
            type: 'Late Arrival',
            amount: lateAmount,
            isMandatory: false
          })
          console.log('⏰ LATE:', record.date, '- Seconds Late:', secondsLate, '- Deduction:', lateAmount)
        }

        // Check for early timeout
        if (record.timeOut) {
          const timeOut = new Date(record.timeOut)
          const expectedTimeOut = new Date(record.date)
          const [outH, outM] = timeOutStart.split(':').map(Number)
          expectedTimeOut.setHours(outH, outM, 0, 0)
          const secondsEarly = Math.max(0, (expectedTimeOut.getTime() - timeOut.getTime()) / 1000)
          const earlyAmount = secondsEarly * perSecondRate

          if (earlyAmount > 0) {
            attendanceDeductions.push({
              type: 'Early Time-Out',
              amount: earlyAmount,
              isMandatory: false
            })
            console.log('🏃 EARLY:', record.date, '- Seconds Early:', secondsEarly, '- Deduction:', earlyAmount)
          }
        }
      }
    })
    
    console.log('✅ Total Attendance Deductions:', attendanceDeductions.length, attendanceDeductions)

    // Get additional pay for this user (not archived)
    const additionalPay = await prisma.overloadPay.findMany({
      where: {
        users_id: userId,
        archivedAt: null
      },
      select: {
        type: true,
        amount: true
      }
    })

    // Get non-attendance deductions for this user (not archived)
    const deductions = await prisma.deduction.findMany({
      where: {
        users_id: userId,
        archivedAt: null
      },
      include: {
        deductionType: {
          select: {
            name: true,
            isMandatory: true,
            calculationType: true,
            percentageValue: true
          }
        }
      }
    })

    // Get active loans for this user
    const loans = await prisma.loan.findMany({
      where: {
        users_id: userId,
        status: 'ACTIVE'
      },
      select: {
        purpose: true,
        amount: true,
        balance: true,
        monthlyPaymentPercent: true
      }
    })

    // Combine attendance deductions with other deductions
    const allDeductions = [
      ...attendanceDeductions,
      ...deductions.map(d => ({
        type: d.deductionType?.name || 'Deduction',
        amount: Number(d.amount),
        isMandatory: d.deductionType?.isMandatory || false,
        calculationType: d.deductionType?.calculationType || 'FIXED',
        percentageValue: d.deductionType?.percentageValue ? Number(d.deductionType.percentageValue) : null
      }))
    ]

    return NextResponse.json(
      {
        additionalPay: additionalPay.map(ap => ({
          type: ap.type || 'OVERTIME',
          amount: Number(ap.amount)
        })),
        deductions: allDeductions,
        loans: loans.map(l => ({
          type: l.purpose || 'Loan',
          originalAmount: Number(l.amount), // Original loan amount
          amount: Number(l.amount) * (Number(l.monthlyPaymentPercent) / 100) / 2, // Semi-monthly payment
          remainingBalance: Number(l.balance),
          monthlyPaymentPercent: Number(l.monthlyPaymentPercent)
        }))
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache'
        }
      }
    )
  } catch (error) {
    console.error('Error fetching payroll details:', error)
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 })
  }
}
