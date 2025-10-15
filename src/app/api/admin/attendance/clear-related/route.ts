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

    let users_id: string | undefined
    let periodStart: Date | undefined
    let periodEnd: Date | undefined
    let appliedDate: Date | undefined

    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json().catch(() => null)
        if (body) {
          users_id = body.users_id
          if (body.periodStart) periodStart = new Date(body.periodStart)
          if (body.periodEnd) periodEnd = new Date(body.periodEnd)
          if (body.date) appliedDate = new Date(body.date)
        }
      }
    } catch {}

    if (!periodStart && !periodEnd && appliedDate) {
      periodStart = new Date(appliedDate.getFullYear(), appliedDate.getMonth(), appliedDate.getDate(), 0, 0, 0, 0)
      periodEnd = new Date(appliedDate.getFullYear(), appliedDate.getMonth(), appliedDate.getDate(), 23, 59, 59, 999)
    }

    const attendanceRelatedNames = ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness']

    const where: any = {
      deductionType: { name: { in: attendanceRelatedNames } },
    }
    if (users_id) where.users_id = users_id
    if (periodStart && periodEnd) where.appliedAt = { gte: periodStart, lte: periodEnd }

    const deleted = await prisma.deduction.deleteMany({ where })

    return NextResponse.json({ success: true, deletedCount: deleted.count })
  } catch (error) {
    console.error('Error clearing attendance-related deductions:', error)
    return NextResponse.json({ error: 'Failed to clear attendance-related deductions' }, { status: 500 })
  }
}












