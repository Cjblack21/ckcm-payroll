import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

// Ensure this route is always dynamically rendered
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { users_id } = await request.json()
    if (!users_id || typeof users_id !== 'string') {
      return NextResponse.json({ error: 'users_id is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { users_id } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const now = new Date()
    const startToday = startOfDay(now)
    const endToday = endOfDay(now)

    // Find today's attendance record
    const record = await prisma.attendance.findFirst({
      where: { 
        users_id, 
        date: { gte: startToday, lte: endToday } 
      },
    })

    if (!record) {
      return NextResponse.json({ 
        status: 'not_timed_in',
        message: 'No attendance record for today'
      })
    }

    if (record.timeIn && !record.timeOut) {
      return NextResponse.json({ 
        status: 'timed_in',
        message: 'Already timed in today',
        timeIn: record.timeIn.toISOString(),
        status_type: record.status
      })
    }

    if (record.timeIn && record.timeOut) {
      return NextResponse.json({ 
        status: 'completed',
        message: 'Already timed in and out today',
        timeIn: record.timeIn.toISOString(),
        timeOut: record.timeOut.toISOString()
      })
    }

    return NextResponse.json({ 
      status: 'unknown',
      message: 'Unknown attendance status'
    })

  } catch (error) {
    console.error('Error checking attendance status:', error)
    return NextResponse.json({ error: 'Failed to check attendance status' }, { status: 500 })
  }
}

















