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
      // Note: Orphaned record checks are skipped because all user relations are required
      // and enforced by foreign key constraints in the database

      // 5. Check for users without personnel types
      const usersWithoutTypes = await prisma.user.count({
        where: {
          role: 'PERSONNEL',
          personnelType: { is: null }
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

      // 10. Check for invalid loan statuses
      const invalidLoanStatuses = await prisma.loan.count({
        where: {
          status: {
            notIn: ['ACTIVE', 'COMPLETED', 'DEFAULTED']
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
            notIn: ['PENDING', 'PRESENT', 'LATE', 'ABSENT', 'PARTIAL']
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

      // 12. Check for zero or negative basic salary
      const personnelWithInvalidSalary = await prisma.user.count({
        where: {
          role: 'PERSONNEL',
          personnelType: {
            is: {
              basicSalary: {
                lte: 0
              }
            }
          }
        }
      })
      checks.push({
        check: 'Personnel With Invalid Basic Salary',
        status: personnelWithInvalidSalary === 0 ? 'PASS' : 'WARN',
        message: personnelWithInvalidSalary === 0 
          ? 'All personnel have valid basic salary' 
          : `${personnelWithInvalidSalary} personnel users have zero or negative basic salary`,
        count: personnelWithInvalidSalary
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










