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

    // Get archived payrolls grouped by period (include both RELEASED and ARCHIVED)
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
          totalAttendanceDeductions: 0,
          totalDatabaseDeductions: 0,
          totalLoanPayments: 0,
          totalGrossSalary: 0,
          totalNetPay: 0,
          releasedAt: payroll.releasedAt?.toISOString() || '',
          releasedBy: session.user.name || 'Admin', // Use actual admin name
          payrolls: [] // Add employee list
        }
      }
      
      // Parse snapshot data
      let snapshot = null
      try {
        snapshot = payroll.breakdownSnapshot ? 
          (typeof payroll.breakdownSnapshot === 'string' ? 
            JSON.parse(payroll.breakdownSnapshot) : 
            payroll.breakdownSnapshot) : null
      } catch (e) {
        console.error('Failed to parse snapshot:', e)
      }
      
      // Use ONLY snapshot data for accurate totals
      const grossSalary = snapshot ? Number(snapshot.periodSalary || 0) : Number(payroll.netPay || 0)
      const totalDeductions = snapshot ? Number(snapshot.totalDeductions || 0) : Number(payroll.deductions || 0)
      const netPay = snapshot ? Number(snapshot.netPay || 0) : Number(payroll.netPay || 0)
      const attendanceDeductions = snapshot ? Number(snapshot.attendanceDeductions || 0) : 0
      const databaseDeductions = snapshot ? Number(snapshot.databaseDeductions || 0) : 0
      const loanPayments = snapshot ? Number(snapshot.loanPayments || 0) : 0
      
      acc[periodKey].totalEmployees++
      acc[periodKey].totalExpenses += grossSalary
      acc[periodKey].totalGrossSalary += grossSalary
      acc[periodKey].totalDeductions += totalDeductions
      acc[periodKey].totalAttendanceDeductions += attendanceDeductions
      acc[periodKey].totalDatabaseDeductions += databaseDeductions
      acc[periodKey].totalLoanPayments += loanPayments
      acc[periodKey].totalNetPay += netPay
      
      // Add employee to payrolls array with parsed snapshot
      const payrollWithSnapshot = {
        ...payroll,
        snapshot: snapshot // Add parsed snapshot to the payroll object
      }
      
      // Log first entry to verify snapshot is included
      if (acc[periodKey].payrolls.length === 0) {
        console.log('📦 First payroll entry with snapshot:', {
          users_id: payroll.users_id,
          hasSnapshot: !!snapshot,
          snapshotKeys: snapshot ? Object.keys(snapshot) : [],
          periodSalary: snapshot?.periodSalary,
          netPay: snapshot?.netPay
        })
      }
      
      acc[periodKey].payrolls.push(payrollWithSnapshot)
      
      return acc
    }, {} as any)

    const archiveList = Object.values(groupedArchives)

    // Debug logging
    console.log('📦 Archive API - Total periods:', archiveList.length)
    console.log('📦 Archive API - First period payrolls count:', archiveList[0]?.payrolls?.length)
    console.log('📦 Archive API - Sample data:', JSON.stringify(archiveList[0], null, 2))

    return NextResponse.json({ 
      success: true, 
      archivedPayrolls: archiveList 
    })

  } catch (error) {
    console.error('Error fetching archived payrolls:', error)
    return NextResponse.json({ error: 'Failed to fetch archived payrolls' }, { status: 500 })
  }
}
