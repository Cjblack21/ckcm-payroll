import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'PERSONNEL') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // numeric 1..12
    const year = searchParams.get('year') // numeric YYYY

    // Build date filter
    let dateFilter: any = {}
    
    if (month && year) {
      // Filter by specific month and year
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0)
      endDate.setHours(23, 59, 59, 999)
      const today = new Date(); today.setHours(23, 59, 59, 999)
      const cappedEnd = endDate > today ? today : endDate
      
      dateFilter = {
        gte: startDate,
        lte: cappedEnd
      }
    } else if (year) {
      // Filter by year only
      const startDate = new Date(parseInt(year), 0, 1)
      const endDate = new Date(parseInt(year), 11, 31)
      endDate.setHours(23, 59, 59, 999)
      const today = new Date(); today.setHours(23, 59, 59, 999)
      const cappedEnd = endDate > today ? today : endDate
      
      dateFilter = {
        gte: startDate,
        lte: cappedEnd
      }
    } else {
      // Default: align with attendance settings period if configured; fallback to current month
      const settings = await prisma.attendanceSettings.findFirst()
      if (settings?.periodStart && settings?.periodEnd) {
        const startDate = new Date(settings.periodStart)
        const endDate = new Date(settings.periodEnd)
        endDate.setHours(23, 59, 59, 999)
        const today = new Date(); today.setHours(23, 59, 59, 999)
        const cappedEnd = endDate > today ? today : endDate
        dateFilter = { gte: startDate, lte: cappedEnd }
      } else {
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)
        const today = new Date(); today.setHours(23, 59, 59, 999)
        const cappedEnd = endDate > today ? today : endDate
        dateFilter = { gte: startDate, lte: cappedEnd }
      }
    }

    // Get attendance records for the user
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        users_id: userId,
        date: dateFilter
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Calculate statistics
    const totalDays = attendanceRecords.length
    // Treat LATE as present for statistics
    const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const absentDays = attendanceRecords.filter(a => a.status === 'ABSENT').length
    const lateDays = attendanceRecords.filter(a => a.status === 'LATE').length
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0'

    // Calculate total hours worked
    let totalHours = 0
    attendanceRecords.forEach(record => {
      if (record.timeIn && record.timeOut) {
        const timeIn = new Date(record.timeIn)
        const timeOut = new Date(record.timeOut)
        const hours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        totalHours += hours
      }
    })

    // Format attendance records
    const formattedRecords = attendanceRecords.map(record => ({
      id: record.attendances_id,
      date: record.date,
      status: record.status,
      timeIn: record.timeIn,
      timeOut: record.timeOut,
      hours: record.timeIn && record.timeOut 
        ? ((new Date(record.timeOut).getTime() - new Date(record.timeIn).getTime()) / (1000 * 60 * 60)).toFixed(2)
        : '0',
      dayOfWeek: record.date.toLocaleDateString('en-US', { weekday: 'long' })
    }))

    return NextResponse.json({
      records: formattedRecords,
      statistics: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        attendanceRate: parseFloat(attendanceRate),
        totalHours: totalHours.toFixed(2)
      },
      period: {
        startDate: dateFilter.gte,
        endDate: dateFilter.lte
      }
    })

  } catch (error) {
    console.error('Error fetching personnel attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}
