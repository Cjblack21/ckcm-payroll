import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Running comprehensive data integrity check...')

    const checks = []

    try {
      // 1. Check for orphaned payroll entries
      const orphanedPayrolls = await prisma.payrollEntry.count({
        where: {
          user: null
        }
      })
      checks.push({
        check: 'Orphaned Payroll Entries',
        status: orphanedPayrolls === 0 ? 'PASS' : 'FAIL',
        message: orphanedPayrolls === 0 
          ? 'No orphaned payroll entries found' 
          : `${orphanedPayrolls} payroll entries have no associated user`,
        count: orphanedPayrolls
      })

      // 2. Check for orphaned deductions
      const orphanedDeductions = await prisma.deduction.count({
        where: {
          user: null
        }
      })
      checks.push({
        check: 'Orphaned Deductions',
        status: orphanedDeductions === 0 ? 'PASS' : 'FAIL',
        message: orphanedDeductions === 0 
          ? 'No orphaned deductions found' 
          : `${orphanedDeductions} deductions have no associated user`,
        count: orphanedDeductions
      })

      // 3. Check for orphaned loans
      const orphanedLoans = await prisma.loan.count({
        where: {
          user: null
        }
      })
      checks.push({
        check: 'Orphaned Loans',
        status: orphanedLoans === 0 ? 'PASS' : 'FAIL',
        message: orphanedLoans === 0 
          ? 'No orphaned loans found' 
          : `${orphanedLoans} loans have no associated user`,
        count: orphanedLoans
      })

      // 4. Check for orphaned attendance records
      const orphanedAttendance = await prisma.attendance.count({
        where: {
          user: null
        }
      })
      checks.push({
        check: 'Orphaned Attendance Records',
        status: orphanedAttendance === 0 ? 'PASS' : 'FAIL',
        message: orphanedAttendance === 0 
          ? 'No orphaned attendance records found' 
          : `${orphanedAttendance} attendance records have no associated user`,
        count: orphanedAttendance
      })

      // 5. Check for users without personnel types
      const usersWithoutTypes = await prisma.user.count({
        where: {
          role: 'PERSONNEL',
          personnelType: null
        }
      })
      checks.push({
        check: 'Personnel Without Types',
        status: usersWithoutTypes === 0 ? 'PASS' : 'WARN',
        message: usersWithoutTypes === 0 
          ? 'All personnel have assigned types' 
          : `${usersWithoutTypes} personnel users have no assigned type`,
        count: usersWithoutTypes
      })

      // 6. Check for negative payroll amounts
      const negativePayrolls = await prisma.payrollEntry.count({
        where: {
          netPay: {
            lt: 0
          }
        }
      })
      checks.push({
        check: 'Negative Payroll Amounts',
        status: negativePayrolls === 0 ? 'PASS' : 'WARN',
        message: negativePayrolls === 0 
          ? 'No negative payroll amounts found' 
          : `${negativePayrolls} payroll entries have negative amounts`,
        count: negativePayrolls
      })

      // 7. Check for future-dated records
      const futureAttendance = await prisma.attendance.count({
        where: {
          date: {
            gt: new Date()
          }
        }
      })
      checks.push({
        check: 'Future-Dated Attendance',
        status: futureAttendance === 0 ? 'PASS' : 'WARN',
        message: futureAttendance === 0 
          ? 'No future-dated attendance records' 
          : `${futureAttendance} attendance records are dated in the future`,
        count: futureAttendance
      })

      // 8. Check for duplicate payroll entries
      const duplicatePayrolls = await prisma.$queryRaw`
        SELECT users_id, periodStart, periodEnd, COUNT(*) as count
        FROM PayrollEntry
        WHERE status != 'ARCHIVED'
        GROUP BY users_id, periodStart, periodEnd
        HAVING COUNT(*) > 1
      ` as any[]
      checks.push({
        check: 'Duplicate Payroll Entries',
        status: duplicatePayrolls.length === 0 ? 'PASS' : 'FAIL',
        message: duplicatePayrolls.length === 0 
          ? 'No duplicate payroll entries found' 
          : `${duplicatePayrolls.length} users have duplicate payroll entries for the same period`,
        count: duplicatePayrolls.length
      })

      // 9. Check for missing deduction types
      const deductionsWithoutTypes = await prisma.deduction.count({
        where: {
          deductionType: null
        }
      })
      checks.push({
        check: 'Deductions Without Types',
        status: deductionsWithoutTypes === 0 ? 'PASS' : 'FAIL',
        message: deductionsWithoutTypes === 0 
          ? 'All deductions have valid types' 
          : `${deductionsWithoutTypes} deductions have no associated type`,
        count: deductionsWithoutTypes
      })

      // 10. Check for invalid loan statuses
      const invalidLoanStatuses = await prisma.loan.count({
        where: {
          status: {
            notIn: ['ACTIVE', 'COMPLETED', 'CANCELLED']
          }
        }
      })
      checks.push({
        check: 'Invalid Loan Statuses',
        status: invalidLoanStatuses === 0 ? 'PASS' : 'FAIL',
        message: invalidLoanStatuses === 0 
          ? 'All loans have valid statuses' 
          : `${invalidLoanStatuses} loans have invalid status values`,
        count: invalidLoanStatuses
      })

      // 11. Check for invalid attendance statuses
      const invalidAttendanceStatuses = await prisma.attendance.count({
        where: {
          status: {
            notIn: ['PRESENT', 'LATE', 'ABSENT', 'PARTIAL']
          }
        }
      })
      checks.push({
        check: 'Invalid Attendance Statuses',
        status: invalidAttendanceStatuses === 0 ? 'PASS' : 'FAIL',
        message: invalidAttendanceStatuses === 0 
          ? 'All attendance records have valid statuses' 
          : `${invalidAttendanceStatuses} attendance records have invalid status values`,
        count: invalidAttendanceStatuses
      })

      // 12. Check for missing basic salary data
      const personnelWithoutSalary = await prisma.user.count({
        where: {
          role: 'PERSONNEL',
          personnelType: {
            basicSalary: null
          }
        }
      })
      checks.push({
        check: 'Personnel Without Basic Salary',
        status: personnelWithoutSalary === 0 ? 'PASS' : 'WARN',
        message: personnelWithoutSalary === 0 
          ? 'All personnel have basic salary defined' 
          : `${personnelWithoutSalary} personnel users have no basic salary defined`,
        count: personnelWithoutSalary
      })

    } catch (error) {
      console.error('Error running integrity checks:', error)
      checks.push({
        check: 'Integrity Check System',
        status: 'FAIL',
        message: 'Failed to run integrity checks: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    }

    // Calculate overall status
    const passCount = checks.filter(c => c.status === 'PASS').length
    const warnCount = checks.filter(c => c.status === 'WARN').length
    const failCount = checks.filter(c => c.status === 'FAIL').length

    console.log('Integrity check completed:', {
      total: checks.length,
      pass: passCount,
      warn: warnCount,
      fail: failCount
    })

    return NextResponse.json({
      checks,
      summary: {
        total: checks.length,
        pass: passCount,
        warn: warnCount,
        fail: failCount,
        overallStatus: failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS'
      }
    })

  } catch (error) {
    console.error('Error running integrity check:', error)
    return NextResponse.json({
      error: 'Failed to run integrity check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}










