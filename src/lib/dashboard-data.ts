import { prisma } from "@/lib/prisma"
import { Role } from '@prisma/client'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns"

export async function getDashboardStats() {
  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  const startOfCurrentMonth = startOfMonth(today)
  const endOfCurrentMonth = endOfMonth(today)

  try {
    // Get total personnel count (users)
    const totalPersonnel = await prisma.user.count({
      where: { isActive: true, role: Role.PERSONNEL }
    })

    // Get monthly payroll (current month)
    const monthlyPayroll = await prisma.payrollEntry.aggregate({
      where: {
        processedAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      _sum: {
        netPay: true
      }
    })

    // Get attendance today
    const attendanceToday = await prisma.attendance.count({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday
        },
        status: "PRESENT"
      }
    })

    // Get absent today
    const absentToday = await prisma.attendance.count({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday
        },
        status: "ABSENT"
      }
    })

    // Get active loans
    const activeLoans = await prisma.loan.count({
      where: { status: "ACTIVE" }
    })

    const totalLoanAmount = await prisma.loan.aggregate({
      where: { status: "ACTIVE" },
      _sum: { balance: true }
    })

    // Get holidays this month
    const holidaysThisMonth = await prisma.holiday.count({
      where: {
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      }
    })

    return {
      totalPersonnel,
      monthlyPayroll: monthlyPayroll._sum.netPay || 0,
      attendanceToday,
      absentToday,
      activeLoans,
      totalLoanAmount: totalLoanAmount._sum.balance || 0,
      holidaysThisMonth
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      totalPersonnel: 0,
      monthlyPayroll: 0,
      attendanceToday: 0,
      absentToday: 0,
      activeLoans: 0,
      totalLoanAmount: 0,
      holidaysThisMonth: 0
    }
  }
}

export async function getAttendanceTrends() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const attendanceData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent
      FROM attendances 
      WHERE date >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month
    ` as Array<{ month: string; present: bigint; absent: bigint }>

    return attendanceData.map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM'),
      present: Number(item.present),
      absent: Number(item.absent)
    }))
  } catch (error) {
    console.error("Error fetching attendance trends:", error)
    return []
  }
}

export async function getPayrollTrends() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const payrollData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(processedAt, '%Y-%m') as month,
        SUM(netPay) as amount
      FROM payroll_entries 
      WHERE processedAt >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(processedAt, '%Y-%m')
      ORDER BY month
    ` as Array<{ month: string; amount: number }>

    return payrollData.map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM'),
      amount: Number(item.amount)
    }))
  } catch (error) {
    console.error("Error fetching payroll trends:", error)
    return []
  }
}

export async function getDepartmentDistribution() {
  try {
    const departmentData = await prisma.department.findMany()

    const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

    return departmentData.map((dept, index) => ({
      name: dept.name,
      value: Math.floor(Math.random() * 10) + 1,
      color: colors[index % colors.length]
    }))
  } catch (error) {
    console.error("Error fetching department distribution:", error)
    return []
  }
}

export async function getLoanTrends() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const loanData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COUNT(*) as loans,
        SUM(amount) as amount
      FROM loans 
      WHERE createdAt >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month
    ` as Array<{ month: string; loans: bigint; amount: number }>

    return loanData.map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM'),
      loans: Number(item.loans),
      amount: Number(item.amount)
    }))
  } catch (error) {
    console.error("Error fetching loan trends:", error)
    return []
  }
}

export async function getCalendarEvents() {
  try {
    const currentMonth = new Date()
    const startOfCurrentMonth = startOfMonth(currentMonth)
    const endOfCurrentMonth = endOfMonth(currentMonth)

    const [holidays, events] = await Promise.all([
      prisma.holiday.findMany({
        where: {
          date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }),
      prisma.event.findMany({
        where: {
          date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      })
    ])

    return {
      holidays: holidays.map(h => ({
        date: h.date,
        name: h.name,
        type: h.type.toLowerCase(),
        description: h.description
      })),
      events: events.map(e => ({
        date: e.date,
        name: e.title,
        type: e.type.toLowerCase(),
        description: e.description
      }))
    }
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    return { holidays: [], events: [] }
  }
}

