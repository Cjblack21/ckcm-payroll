import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePayslipsHTML, getHeaderSettings } from '@/lib/payslip-generator'

async function handlePayslipGeneration(periodStart: string | null, periodEnd: string | null, userId: string | null) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get header settings for payslip generation
    const headerSettings = await getHeaderSettings()
    
    if (!headerSettings) {
      return NextResponse.json({ error: 'Header settings not configured' }, { status: 400 })
    }

    // Determine period dates
    let startDate: Date
    let endDate: Date
    
    if (periodStart && periodEnd) {
      startDate = new Date(periodStart)
      endDate = new Date(periodEnd)
    } else {
      // Auto-determine current period
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      
      if (now.getDate() <= 15) {
        startDate = new Date(currentYear, currentMonth, 1)
        endDate = new Date(currentYear, currentMonth, 15)
      } else {
        startDate = new Date(currentYear, currentMonth, 16)
        endDate = new Date(currentYear, currentMonth + 1, 0)
      }
    }

    // Get released payroll entries with all necessary data
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: {
        periodStart: startDate,
        periodEnd: endDate,
        status: 'RELEASED',
        ...(userId ? { users_id: userId } : {})
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    if (payrollEntries.length === 0) {
      return NextResponse.json({ error: 'No released payroll entries found for this period' }, { status: 400 })
    }

    // Fetch detailed breakdown data for each employee
    const payslipData = await Promise.all(payrollEntries.map(async (entry) => {
      // Get attendance records for the period
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          users_id: entry.users_id,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      })

      // Get deductions for this user
      // For mandatory deductions (PhilHealth, SSS, Pag-IBIG), don't filter by date - they apply to every period
      // For other deductions, only include those within the current period
      const deductionRecords = await prisma.deduction.findMany({
        where: {
          users_id: entry.users_id,
          OR: [
            // Mandatory deductions - always include
            {
              deductionType: {
                isMandatory: true
              }
            },
            // Other deductions - only within period
            {
              deductionType: {
                isMandatory: false
              },
              appliedAt: {
                gte: startDate,
                lte: endDate
              }
            }
          ]
        },
        include: {
          deductionType: true
        }
      })

      // Get active loans
      const loanRecords = await prisma.loan.findMany({
        where: {
          users_id: entry.users_id,
          status: 'ACTIVE'
        }
      })

      // Calculate period factor for loan payments
      const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const loanFactor = periodDays <= 16 ? 0.5 : 1.0

      // Build loan details
      const loanDetails = loanRecords.map(loan => {
        const monthlyPayment = Number(loan.amount) * Number(loan.monthlyPaymentPercent) / 100
        const periodPayment = monthlyPayment * loanFactor
        return {
          type: 'Loan Payment',
          amount: periodPayment,
          description: `${loan.purpose} (${loan.monthlyPaymentPercent}% of ₱${Number(loan.amount).toLocaleString()})`,
          remainingBalance: Number(loan.balance)
        }
      })

      // Build deduction details (excluding attendance-related deductions)
      const otherDeductionDetails = deductionRecords
        .filter(d => 
          !d.deductionType.name.includes('Late') &&
          !d.deductionType.name.includes('Absent') &&
          !d.deductionType.name.includes('Early') &&
          !d.deductionType.name.includes('Partial') &&
          !d.deductionType.name.includes('Tardiness')
        )
        .map(deduction => ({
          type: deduction.deductionType.name,
          amount: Number(deduction.amount),
          description: deduction.deductionType.description || deduction.notes || '',
          calculationType: deduction.deductionType.calculationType,
          percentageValue: deduction.deductionType.percentageValue ? Number(deduction.deductionType.percentageValue) : undefined,
          isMandatory: deduction.deductionType.isMandatory
        }))

      // USE BREAKDOWN DATA ONLY - NO RECALCULATION
      const storedBreakdown = (entry as any).breakdown as any
      const attendanceDeductionDetails = storedBreakdown?.attendanceDeductionDetails || []
      const totalAttendanceDeductions = storedBreakdown?.totalAttendanceDeductions || 0
      
      // Calculate total work hours from attendance records
      const totalWorkHours = attendanceRecords.reduce((sum, record) => {
        let hours = 0
        if (record.timeIn && record.timeOut) {
          const timeIn = new Date(record.timeIn)
          const timeOut = new Date(record.timeOut)
          hours = Math.max(0, (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60))
        }
        return sum + hours
      }, 0)

      const totalLoanPayments = loanDetails.reduce((sum, loan) => sum + loan.amount, 0)
      const totalOtherDeductions = otherDeductionDetails.reduce((sum, ded) => sum + ded.amount, 0)

      return {
        users_id: entry.users_id,
        name: entry.user.name,
        email: entry.user.email,
        totalHours: totalWorkHours,
        totalSalary: Number(entry.netPay),
        released: entry.status === 'RELEASED',
        breakdown: {
          biweeklyBasicSalary: Number(entry.basicSalary),
          realTimeEarnings: Number(entry.basicSalary) + Number(entry.overtime),
          realWorkHours: totalWorkHours,
          overtimePay: Number(entry.overtime),
          attendanceDeductions: totalAttendanceDeductions,
          nonAttendanceDeductions: totalOtherDeductions,
          loanPayments: totalLoanPayments,
          grossPay: Number(entry.basicSalary) + Number(entry.overtime),
          totalDeductions: Number(entry.deductions),
          netPay: Number(entry.netPay),
          deductionDetails: otherDeductionDetails,
          loanDetails: loanDetails,
          otherDeductionDetails: otherDeductionDetails,
          attendanceDeductionDetails: attendanceDeductionDetails
        }
      }
    }))

    // Generate HTML using the full-featured payslip generator
    const html = generatePayslipsHTML(
      payslipData,
      {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString()
      },
      headerSettings,
      6 // 6 payslips per page for Long Bond Paper
    )

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="payslips-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating payslips:', error)
    return NextResponse.json({ error: 'Failed to generate payslips' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodStart = searchParams.get('periodStart')
  const periodEnd = searchParams.get('periodEnd')
  const userId = searchParams.get('userId')
  return handlePayslipGeneration(periodStart, periodEnd, userId)
}

export async function POST(request: NextRequest) {
  const { periodStart, periodEnd, userId } = await request.json()
  return handlePayslipGeneration(periodStart, periodEnd, userId)
}
