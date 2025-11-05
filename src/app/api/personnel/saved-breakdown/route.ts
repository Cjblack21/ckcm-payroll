import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPayrollSummary } from '@/lib/actions/payroll'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current payroll summary (SAME as admin sees)
    const result = await getPayrollSummary()
    
    if (!result.success || !result.summary) {
      return NextResponse.json({ error: 'No payroll data' }, { status: 404 })
    }

    // Find THIS user's entry
    const userEntry = result.summary.payrollEntries.find(
      (entry: any) => entry.users_id === session.user.id
    )

    if (!userEntry) {
      return NextResponse.json({ error: 'No payroll found for user' }, { status: 404 })
    }

    // Return EXACT data from admin's view
    return NextResponse.json({
      monthlyBasicSalary: userEntry.personnelType?.basicSalary || 0,
      periodSalary: (userEntry.personnelType?.basicSalary || 0) / 2,
      overloadPay: userEntry.totalAdditions || 0,
      totalDeductions: userEntry.totalDeductions || 0,
      netPay: userEntry.netSalary || 0,
      attendanceDeductions: userEntry.attendanceDeductions || 0,
      loanDeductions: userEntry.loanPayments || 0,
      otherDeductions: userEntry.databaseDeductions || 0,
      status: userEntry.status,
      periodStart: result.summary.periodStart,
      periodEnd: result.summary.periodEnd
    })

  } catch (error) {
    console.error('Error fetching saved breakdown:', error)
    return NextResponse.json({ error: 'Failed to fetch breakdown' }, { status: 500 })
  }
}
