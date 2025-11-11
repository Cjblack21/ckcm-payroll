import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get archived payroll entries
    const archivedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        status: 'ARCHIVED'
      },
      include: {
        user: {
          select: {
            users_id: true,
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
        archivedAt: 'desc'
      }
    })

    // Group by period for better organization and calculate breakdown
    const payrollsByPeriod = archivedPayrolls.reduce((acc, payroll) => {
      const periodKey = `${payroll.periodStart.toISOString().split('T')[0]}_${payroll.periodEnd.toISOString().split('T')[0]}`
      
      if (!acc[periodKey]) {
        acc[periodKey] = {
          id: periodKey,
          periodStart: payroll.periodStart.toISOString(),
          periodEnd: payroll.periodEnd.toISOString(),
          archivedAt: payroll.archivedAt?.toISOString() || new Date().toISOString(),
          releasedAt: payroll.releasedAt?.toISOString() || new Date().toISOString(),
          releasedBy: (payroll as any).releasedBy || 'System',
          totalEmployees: 0,
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalAttendanceDeductions: 0,
          totalDatabaseDeductions: 0,
          totalLoanPayments: 0,
          totalNetPay: 0,
          totalExpenses: 0,
          payrolls: []
        }
      }
      
      // Calculate breakdown
      const grossSalary = Number(payroll.basicSalary) || 0
      const deductions = Number(payroll.deductions) || 0
      const attendanceDeductions = Number((payroll as any).attendanceDeductions) || 0
      const databaseDeductions = Number((payroll as any).databaseDeductions) || 0
      const loanPayments = Number((payroll as any).loanPayments) || 0
      const netPay = Number(payroll.netPay) || 0
      
      acc[periodKey].totalEmployees += 1
      acc[periodKey].totalGrossSalary += grossSalary
      acc[periodKey].totalDeductions += deductions
      acc[periodKey].totalAttendanceDeductions += attendanceDeductions
      acc[periodKey].totalDatabaseDeductions += databaseDeductions
      acc[periodKey].totalLoanPayments += loanPayments
      acc[periodKey].totalNetPay += netPay
      acc[periodKey].totalExpenses += grossSalary
      
      acc[periodKey].payrolls.push(payroll)
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      archivedPayrolls: Object.values(payrollsByPeriod),
      totalCount: archivedPayrolls.length
    })

  } catch (error) {
    console.error('Error fetching archived payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch archived payrolls' },
      { status: 500 }
    )
  }
}











