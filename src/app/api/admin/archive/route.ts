import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"


export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching archived payroll and loan data...')

    // Fetch archived payrolls
    const archivedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        status: {
          in: ['RELEASED', 'ARCHIVED']
        }
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      },
      orderBy: {
        periodStart: 'desc'
      }
    })

    // Fetch archived loans
    const archivedLoans = await prisma.loan.findMany({
      where: { archivedAt: { not: null } },
      include: {
        user: { 
          select: { 
            users_id: true, 
            name: true, 
            email: true,
            personnelType: {
              select: {
                department: true
              }
            }
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group archived payrolls by period and calculate totals
    const groupedPayrollArchives = archivedPayrolls.reduce((acc, payroll) => {
      const periodKey = `${payroll.periodStart.toISOString()}-${payroll.periodEnd.toISOString()}`
      
      if (!acc[periodKey]) {
        acc[periodKey] = {
          id: periodKey,
          periodStart: payroll.periodStart.toISOString().split('T')[0],
          periodEnd: payroll.periodEnd.toISOString().split('T')[0],
          totalEmployees: 0,
          totalExpenses: 0,
          totalDeductions: 0,
          totalAttendanceDeductions: 0,
          totalDatabaseDeductions: 0,
          totalLoanPayments: 0,
          totalGrossSalary: 0,
          totalNetPay: 0,
          releasedAt: payroll.releasedAt?.toISOString() || '',
          releasedBy: session.user.name || 'Admin',
          payrolls: []
        }
      }
      
      // Parse breakdown snapshot to get deduction details
      let attendanceDeductions = 0
      let loanPayments = 0
      let otherDeductions = 0
      
      if (payroll.breakdownSnapshot) {
        try {
          const breakdown = JSON.parse(payroll.breakdownSnapshot)
          attendanceDeductions = Number(breakdown.attendanceDeductions || 0)
          loanPayments = Number(breakdown.loanDeductions || 0)
          otherDeductions = Number(breakdown.otherDeductions || 0)
        } catch (e) {
          console.error('Error parsing breakdown snapshot:', e)
        }
      }
      
      // Accumulate totals
      acc[periodKey].totalEmployees++
      acc[periodKey].totalExpenses += Number(payroll.basicSalary)
      acc[periodKey].totalGrossSalary += Number(payroll.basicSalary)
      acc[periodKey].totalDeductions += Number(payroll.deductions)
      acc[periodKey].totalAttendanceDeductions += attendanceDeductions
      acc[periodKey].totalDatabaseDeductions += otherDeductions
      acc[periodKey].totalLoanPayments += loanPayments
      acc[periodKey].totalNetPay += Number(payroll.netPay)
      
      // Add employee to payrolls array
      acc[periodKey].payrolls.push(payroll)
      
      return acc
    }, {} as any)

    const payrollArchiveList = Object.values(groupedPayrollArchives)

    // Format archived loans
    const loanArchiveList = archivedLoans.map(l => ({
      loans_id: l.loans_id,
      users_id: l.users_id,
      userName: l.user?.name ?? null,
      userEmail: l.user?.email || '',
      department: l.user?.personnelType?.department ?? null,
      amount: Number(l.amount),
      balance: Number(l.balance),
      monthlyPaymentPercent: Number(l.monthlyPaymentPercent),
      termMonths: l.termMonths,
      status: l.status,
      purpose: l.purpose,
      createdAt: l.createdAt.toISOString(),
      archivedAt: l.archivedAt?.toISOString() || null,
    }))

    console.log('📦 Archive API - Payroll periods:', payrollArchiveList.length)
    console.log('📦 Archive API - Archived loans:', loanArchiveList.length)

    return NextResponse.json({ 
      success: true,
      payrolls: payrollArchiveList,
      loans: loanArchiveList,
      totalPayrollPeriods: payrollArchiveList.length,
      totalArchivedLoans: loanArchiveList.length
    })
  } catch (error) {
    console.error('Error fetching archive:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Failed to fetch archive',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}













