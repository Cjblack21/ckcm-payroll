import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '1')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const formatType = searchParams.get('format') || 'csv'

    if (formatType !== 'csv') {
      return NextResponse.json({ error: 'Only CSV format is supported' }, { status: 400 })
    }

    // Create date range for the selected month
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = endOfMonth(monthStart)

    // Get all active personnel
    const users = await prisma.user.findMany({
      where: { 
        isActive: true, 
        role: 'PERSONNEL' 
      },
      include: {
        personnelType: {
          select: {
            name: true,
            basicSalary: true
          }
        }
      }
    })

    const userIds = users.map(u => u.users_id)

    // Get payroll entries for the month
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: {
        users_id: { in: userIds },
        processedAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    })

    // Get deductions for the month
    const deductions = await prisma.deduction.findMany({
      where: {
        users_id: { in: userIds },
        appliedAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      include: {
        deductionType: {
          select: {
            name: true
          }
        }
      }
    })

    // Get loans for the month
    const loans = await prisma.loan.findMany({
      where: {
        users_id: { in: userIds },
        status: 'ACTIVE',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart }
      }
    })

    // Get attendance for the month
    const attendance = await prisma.attendance.findMany({
      where: {
        users_id: { in: userIds },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    })

    // Calculate data for each user
    const csvData = users.map(user => {
      const userPayroll = payrollEntries.filter(entry => entry.users_id === user.users_id)
      const userDeductions = deductions.filter(deduction => deduction.users_id === user.users_id)
      const userLoans = loans.filter(loan => loan.users_id === user.users_id)
      const userAttendance = attendance.filter(record => record.users_id === user.users_id)

      const totalDeductions = userDeductions.reduce((sum, deduction) => sum + Number(deduction.amount), 0)
      const totalLoans = userLoans.reduce((sum, loan) => {
        const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
        return sum + monthlyPayment
      }, 0)

      const netPay = userPayroll.reduce((sum, entry) => sum + Number(entry.netPay), 0)
      const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
      
      const presentDays = userAttendance.filter(record => record.status === 'PRESENT').length
      const totalDays = userAttendance.length
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0

      return {
        'Employee ID': user.users_id,
        'Name': user.name || '',
        'Email': user.email,
        'Personnel Type': user.personnelType?.name || 'No Type',
        'Basic Salary': basicSalary,
        'Total Deductions': totalDeductions,
        'Total Loans': totalLoans,
        'Net Pay': netPay,
        'Present Days': presentDays,
        'Total Days': totalDays,
        'Attendance Rate (%)': attendanceRate.toFixed(2)
      }
    })

    // Create CSV content
    const headers = [
      'Employee ID',
      'Name', 
      'Email',
      'Personnel Type',
      'Basic Salary',
      'Total Deductions',
      'Total Loans',
      'Net Pay',
      'Present Days',
      'Total Days',
      'Attendance Rate (%)'
    ]

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Calculate summary row
    const totalBasicSalary = csvData.reduce((sum, row) => sum + row['Basic Salary'], 0)
    const totalDeductions = csvData.reduce((sum, row) => sum + row['Total Deductions'], 0)
    const totalLoans = csvData.reduce((sum, row) => sum + row['Total Loans'], 0)
    const totalNetPay = csvData.reduce((sum, row) => sum + row['Net Pay'], 0)
    const averageAttendanceRate = csvData.length > 0 
      ? csvData.reduce((sum, row) => sum + parseFloat(row['Attendance Rate (%)']), 0) / csvData.length 
      : 0

    const summaryRow = [
      'TOTALS',
      '',
      '',
      '',
      totalBasicSalary,
      totalDeductions,
      totalLoans,
      totalNetPay,
      '',
      '',
      averageAttendanceRate.toFixed(2)
    ].join(',')

    const finalCsvContent = csvContent + '\n' + summaryRow

    // Return CSV file
    return new NextResponse(finalCsvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll-report-${year}-${month.toString().padStart(2, '0')}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json({
      error: 'Failed to export report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}










