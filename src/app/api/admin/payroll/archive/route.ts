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

    const adminId = session.user.id
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
        // First half of month (1st to 15th)
        startDate = new Date(currentYear, currentMonth, 1)
        endDate = new Date(currentYear, currentMonth, 15)
      } else {
        // Second half of month (16th to end of month)
        startDate = new Date(currentYear, currentMonth, 16)
        endDate = new Date(currentYear, currentMonth + 1, 0)
      }
    }

    // Update all released payroll entries to 'Archived' status
    const archiveResult = await prisma.payrollEntry.updateMany({
      where: {
        periodStart: startDate,
        periodEnd: endDate,
        status: 'RELEASED'
      },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date()
      }
    })

    // Note: Audit logging would require adding auditLog model to schema

    return NextResponse.json({ 
      success: true, 
      archivedCount: archiveResult.count,
      message: `Payroll archived successfully for ${archiveResult.count} employees` 
    })

  } catch (error) {
    console.error('Error archiving payroll:', error)
    return NextResponse.json({ error: 'Failed to archive payroll' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get archived payrolls grouped by period
    const archivedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        status: 'ARCHIVED'
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

    // Group by period and calculate totals
    const groupedArchives = archivedPayrolls.reduce((acc, payroll) => {
      const periodKey = `${payroll.periodStart.toISOString()}-${payroll.periodEnd.toISOString()}`
      
      if (!acc[periodKey]) {
        acc[periodKey] = {
          id: periodKey,
          periodStart: payroll.periodStart.toISOString().split('T')[0],
          periodEnd: payroll.periodEnd.toISOString().split('T')[0],
          totalEmployees: 0,
          totalExpenses: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          releasedAt: payroll.releasedAt?.toISOString() || '',
          releasedBy: session.user.name || 'Admin' // Use actual admin name
        }
      }
      
      // Accumulate totals
      acc[periodKey].totalEmployees++
      acc[periodKey].totalExpenses += Number(payroll.basicSalary)
      acc[periodKey].totalDeductions += Number(payroll.deductions)
      acc[periodKey].totalNetPay += Number(payroll.netPay)
      
      return acc
    }, {} as any)

    const archiveList = Object.values(groupedArchives)

    return NextResponse.json({ 
      success: true, 
      archivedPayrolls: archiveList 
    })

  } catch (error) {
    console.error('Error fetching archived payrolls:', error)
    return NextResponse.json({ error: 'Failed to fetch archived payrolls' }, { status: 500 })
  }
}
