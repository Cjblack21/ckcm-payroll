import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStartOfDayInPhilippines, getEndOfDayInPhilippines, getNowInPhilippines } from "@/lib/timezone"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inputUsersId = typeof body?.users_id === 'string' ? body.users_id : null
    const inputEmail = typeof body?.email === 'string' ? body.email : null

    if (!inputUsersId && !inputEmail) {
      return NextResponse.json({ error: 'users_id or email is required' }, { status: 400 })
    }

    // Resolve user either by users_id or email
    const user = inputUsersId
      ? await prisma.user.findUnique({ where: { users_id: inputUsersId } })
      : await prisma.user.findUnique({ where: { email: inputEmail! } })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const now = getNowInPhilippines()
    const startToday = getStartOfDayInPhilippines(now)
    const endToday = getEndOfDayInPhilippines(now)

    // Find today's attendance record
    const record = await prisma.attendance.findFirst({
      where: { 
        users_id: user.users_id, 
        date: { gte: startToday, lte: endToday } 
      },
    })

    return NextResponse.json({
      hasRecord: !!record,
      timeIn: record?.timeIn || null,
      timeOut: record?.timeOut || null,
      status: record?.status || null
    })
  } catch (error) {
    console.error('Error checking attendance status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
