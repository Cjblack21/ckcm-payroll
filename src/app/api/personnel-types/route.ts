import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Optionally derive working days from attendance settings period; fallback to 22 and exclude Sundays
    const attendanceSettings = await prisma.attendanceSettings.findFirst()

    let workingDays = 22
    let periodStart: Date | null = null
    let periodEnd: Date | null = null

    if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
      periodStart = new Date(attendanceSettings.periodStart)
      periodEnd = new Date(attendanceSettings.periodEnd)

      let days = 0
      const current = new Date(periodStart)
      current.setHours(0, 0, 0, 0)
      const end = new Date(periodEnd)
      end.setHours(23, 59, 59, 999)
      while (current <= end) {
        if (current.getDay() !== 0) { // Exclude Sundays
          days++
        }
        current.setDate(current.getDate() + 1)
      }
      if (days > 0) workingDays = days
    }

    const personnelTypes = await prisma.personnelType.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        personnel_types_id: true,
        name: true,
        type: true,
        department: true,
        basicSalary: true,
        isActive: true
      }
    })

    // Convert Decimal to number and add detailed breakdown
    const enriched = personnelTypes.map(type => {
      const basic = Number(type.basicSalary)
      const dailyRate = workingDays > 0 ? basic / workingDays : 0
      const hourlyRate = dailyRate / 8
      const perMinute = hourlyRate / 60
      const perSecond = perMinute / 60

      return {
        ...type,
        basicSalary: basic,
        workingDaysUsed: workingDays,
        periodStart: periodStart?.toISOString() ?? null,
        periodEnd: periodEnd?.toISOString() ?? null,
        dailyRate,
        hourlyRate,
        perMinute,
        perSecond,
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error fetching personnel types:', error)
    return NextResponse.json({ error: 'Failed to fetch personnel types' }, { status: 500 })
  }
}
