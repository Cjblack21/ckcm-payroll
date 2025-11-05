import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch ALL payroll entries that have a saved breakdownSnapshot
    // Don't filter by status or period - just get anything with a snapshot
    const releasedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        breakdownSnapshot: {
          not: null // Only entries with saved snapshots
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
        updatedAt: 'desc' // Most recently updated first
      }
    })

    // Transform to match PayrollEntry type - USE EXACT SNAPSHOT DATA
    const savedPayrolls = releasedPayrolls.map(entry => {
      // Parse breakdown snapshot - THIS IS THE EXACT SAVED DATA
      let snapshot = null
      try {
        snapshot = entry.breakdownSnapshot ? 
          (typeof entry.breakdownSnapshot === 'string' ? 
            JSON.parse(entry.breakdownSnapshot) : 
            entry.breakdownSnapshot) : null
      } catch (e) {
        console.error('Failed to parse snapshot:', e)
      }

      // If no snapshot, skip this entry (shouldn't happen for RELEASED status)
      if (!snapshot) {
        console.warn('No snapshot for released payroll:', entry.users_id)
        return null
      }

      // USE EXACT SNAPSHOT VALUES - NO RECALCULATION
      // periodSalary in snapshot = gross pay (basic + overload)
      const grossPay = snapshot.periodSalary || 0
      const monthlyBasicSalary = snapshot.monthlyBasicSalary || 0
      const semiMonthlyBase = monthlyBasicSalary / 2
      const overloadPay = snapshot.totalAdditions || 0

      return {
        users_id: entry.users_id,
        name: entry.user?.name || 'N/A',
        email: entry.user?.email || 'N/A',
        personnelType: snapshot.personnelType || entry.user?.personnelType?.name,
        personnelTypeCategory: entry.user?.personnelType?.type,
        department: entry.user?.personnelType?.department,
        totalWorkHours: snapshot.totalWorkHours || 0,
        finalNetPay: snapshot.netPay, // USE EXACT NET PAY FROM SNAPSHOT
        status: entry.status,
        breakdown: {
          basicSalary: semiMonthlyBase, // Semi-monthly base
          monthlyBasicSalary: monthlyBasicSalary,
          attendanceDeductions: snapshot.attendanceDeductions || 0,
          loanDeductions: snapshot.loanPayments || 0,
          otherDeductions: snapshot.databaseDeductions || 0,
          netPay: snapshot.netPay, // EXACT net pay from snapshot
          attendanceDetails: snapshot.attendanceRecords || [],
          loanDetails: [],
          otherDeductionDetails: snapshot.deductionDetails || [],
          overloadPay: overloadPay // EXACT overload from snapshot
        }
      }
    }).filter(Boolean) // Remove any null entries

    return NextResponse.json({ savedPayrolls })

  } catch (error) {
    console.error('Error fetching saved payrolls:', error)
    return NextResponse.json({ error: 'Failed to fetch saved payrolls' }, { status: 500 })
  }
}
