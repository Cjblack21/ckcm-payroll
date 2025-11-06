import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, periodStart, periodEnd, breakdownData } = await request.json()

    if (!userId || !periodStart || !periodEnd || !breakdownData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the payroll entry
    const payrollEntry = await prisma.payrollEntry.findFirst({
      where: {
        users_id: userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd)
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    if (!payrollEntry) {
      return NextResponse.json({ error: 'Payroll entry not found' }, { status: 404 })
    }

    // Create the breakdown snapshot from the current breakdown data
    const breakdownSnapshot = {
      monthlyBasicSalary: breakdownData.monthlyBasicSalary,
      periodSalary: breakdownData.basicSalary + (breakdownData.overloadPay || 0), // Gross pay
      totalDeductions: breakdownData.attendanceDeductions + breakdownData.loanDeductions + breakdownData.otherDeductions,
      totalAdditions: breakdownData.overloadPay || 0,
      overloadPayDetails: breakdownData.overloadPayDetails || [], // Include additional pay details with types
      netPay: (breakdownData.basicSalary + (breakdownData.overloadPay || 0)) - (breakdownData.attendanceDeductions + breakdownData.loanDeductions + breakdownData.otherDeductions),
      totalWorkHours: 0, // Can be added if needed
      attendanceDeductions: breakdownData.attendanceDeductions,
      databaseDeductions: breakdownData.otherDeductions,
      loanPayments: breakdownData.loanDeductions,
      attendanceRecords: breakdownData.attendanceDetails || [],
      deductionDetails: breakdownData.otherDeductionDetails || [],
      personnelType: payrollEntry.user?.personnelType?.name
    }

    // Update the payroll entry with the snapshot and change status to ARCHIVED
    await prisma.payrollEntry.update({
      where: {
        payroll_entries_id: payrollEntry.payroll_entries_id
      },
      data: {
        breakdownSnapshot: JSON.stringify(breakdownSnapshot),
        status: 'ARCHIVED' // Move to Saved Payroll Breakdown tab
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Breakdown archived successfully' 
    })

  } catch (error) {
    console.error('Error saving breakdown:', error)
    return NextResponse.json({ 
      error: 'Failed to save breakdown' 
    }, { status: 500 })
  }
}
