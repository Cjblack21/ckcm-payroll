import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Generating data retention statistics...')

    // Get counts for all major entities
    const [
      totalUsers,
      totalPayrollEntries,
      totalAttendanceRecords,
      totalDeductions,
      totalLoans,
      totalHolidays,
      oldestUser,
      newestUser,
      oldestPayroll,
      newestPayroll,
      oldestAttendance,
      newestAttendance
    ] = await Promise.all([
      prisma.user.count(),
      prisma.payrollEntry.count(),
      prisma.attendance.count(),
      prisma.deduction.count(),
      prisma.loan.count(),
      prisma.holiday.count(),
      prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }),
      prisma.user.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.payrollEntry.findFirst({ orderBy: { createdAt: 'asc' } }),
      prisma.payrollEntry.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.attendance.findFirst({ orderBy: { date: 'asc' } }),
      prisma.attendance.findFirst({ orderBy: { date: 'desc' } })
    ])

    // Calculate data size estimation (rough calculation)
    const estimatedDataSize = (
      totalUsers * 0.5 + // ~0.5KB per user
      totalPayrollEntries * 0.3 + // ~0.3KB per payroll entry
      totalAttendanceRecords * 0.1 + // ~0.1KB per attendance record
      totalDeductions * 0.2 + // ~0.2KB per deduction
      totalLoans * 0.4 + // ~0.4KB per loan
      totalHolidays * 0.1 // ~0.1KB per holiday
    )

    const formatDataSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes.toFixed(1)} KB`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} MB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} GB`
    }

    // Determine oldest and newest records
    const dates = [
      oldestUser?.createdAt,
      oldestPayroll?.createdAt,
      oldestAttendance?.date
    ].filter(Boolean).map(d => new Date(d!))

    const newestDates = [
      newestUser?.createdAt,
      newestPayroll?.createdAt,
      newestAttendance?.date
    ].filter(Boolean).map(d => new Date(d!))

    const oldestRecord = dates.length > 0 
      ? new Date(Math.min(...dates.map(d => d.getTime()))).toLocaleDateString()
      : 'No records found'

    const newestRecord = newestDates.length > 0
      ? new Date(Math.max(...newestDates.map(d => d.getTime()))).toLocaleDateString()
      : 'No records found'

    const stats = {
      totalUsers,
      totalPayrollEntries,
      totalAttendanceRecords,
      totalDeductions,
      totalLoans,
      totalHolidays,
      oldestRecord,
      newestRecord,
      dataSize: formatDataSize(estimatedDataSize),
      retentionPolicy: 'FOREVER - All data retained indefinitely'
    }

    // Run basic integrity checks
    const integrityChecks = await runBasicIntegrityChecks()

    console.log('Data retention statistics generated:', {
      totalUsers,
      totalPayrollEntries,
      totalAttendanceRecords,
      dataSize: stats.dataSize
    })

    return NextResponse.json({
      stats,
      integrityChecks
    })

  } catch (error) {
    console.error('Error generating data retention stats:', error)
    return NextResponse.json({
      error: 'Failed to generate data retention statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function runBasicIntegrityChecks() {
  const checks = []

  try {
    // Check for orphaned payroll entries
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

    // Check for orphaned deductions
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

    // Check for orphaned loans
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

    // Check for orphaned attendance records
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

    // Check for users without personnel types
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

    // Check for negative payroll amounts
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

    // Check for future-dated records
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

  } catch (error) {
    console.error('Error running integrity checks:', error)
    checks.push({
      check: 'Integrity Check System',
      status: 'FAIL',
      message: 'Failed to run integrity checks: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }

  return checks
}










