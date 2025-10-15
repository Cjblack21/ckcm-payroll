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

    const { periodStart, periodEnd } = await request.json()

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

    // 1. Company Summary Report
    const companySummary = await prisma.payrollEntry.aggregate({
      where: {
        periodStart: startDate,
        periodEnd: endDate,
        status: { in: ['RELEASED', 'ARCHIVED'] }
      },
      _sum: {
        basicSalary: true,
        deductions: true,
        netPay: true
      },
      _count: {
        users_id: true
      }
    })

    // 2. Employee Contribution Report (per-employee breakdown)
    const employeeContributions = await prisma.payrollEntry.findMany({
      where: {
        periodStart: startDate,
        periodEnd: endDate,
        status: { in: ['RELEASED', 'ARCHIVED'] }
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    // 3. Audit Log Report (placeholder - would need auditLog model)
    const auditLog: any[] = [] // Would need to implement with actual auditLog model

    const reports = {
      companySummary: {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        totalEmployees: companySummary._count.users_id,
        totalSalaryExpenses: Number(companySummary._sum.basicSalary || 0),
        totalDeductions: Number(companySummary._sum.deductions || 0),
        totalNetPay: Number(companySummary._sum.netPay || 0)
      },
      employeeContribution: employeeContributions.map(entry => ({
        employeeName: entry.user.name,
        employeeEmail: entry.user.email,
        personnelType: entry.user.personnelType?.name,
        grossSalary: Number(entry.basicSalary),
        totalDeductions: Number(entry.deductions),
        netSalary: Number(entry.netPay),
        contributionBreakdown: {
          attendanceDeductions: Number(entry.deductions),
          loanPayments: 0, // Would need to be calculated from loans
          otherDeductions: 0 // Would need to be calculated from deduction details
        }
      })),
      auditLog: auditLog // Empty array for now
    }

    // Note: Report saving and audit logging would require adding payrollReport and auditLog models to schema

    return NextResponse.json({ 
      success: true, 
      reports 
    })

  } catch (error) {
    console.error('Error generating payroll reports:', error)
    return NextResponse.json({ error: 'Failed to generate payroll reports' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Note: Would need payrollReport model to save/retrieve reports
    return NextResponse.json({ 
      success: true, 
      reports: [] // Empty array for now
    })

  } catch (error) {
    console.error('Error fetching payroll reports:', error)
    return NextResponse.json({ error: 'Failed to fetch payroll reports' }, { status: 500 })
  }
}
