import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { users_id, date } = await request.json()
    
    if (!users_id || !date) {
      return NextResponse.json({ error: 'users_id and date are required' }, { status: 400 })
    }

    const targetDate = new Date(date)
    const startOfTargetDay = startOfDay(targetDate)
    const endOfTargetDay = endOfDay(targetDate)

    // Check if user exists and is active
    const user = await prisma.user.findUnique({ 
      where: { users_id },
      include: { personnelType: true }
    })
    
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    // Find existing attendance record for the date
    let attendanceRecord = await prisma.attendance.findFirst({
      where: { 
        users_id, 
        date: { gte: startOfTargetDay, lte: endOfTargetDay } 
      },
    })

    if (attendanceRecord) {
      // Update existing record to ABSENT only if it's still PENDING
      if (attendanceRecord.status === 'PENDING') {
        attendanceRecord = await prisma.attendance.update({
          where: { attendances_id: attendanceRecord.attendances_id },
          data: { status: 'ABSENT' }
        })
      } else {
        return NextResponse.json({ 
          error: 'Cannot mark as absent - user already has attendance record with status: ' + attendanceRecord.status 
        }, { status: 400 })
      }
    } else {
      // Normalize date to start of day to ensure consistency with existing records
      const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0)
      
      // Create new ABSENT record
      attendanceRecord = await prisma.attendance.create({
        data: {
          users_id,
          date: normalizedDate,
          status: 'ABSENT'
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User marked as absent',
      record: {
        attendances_id: attendanceRecord.attendances_id,
        users_id: attendanceRecord.users_id,
        date: attendanceRecord.date.toISOString(),
        status: attendanceRecord.status
      }
    })
  } catch (error) {
    console.error('Error marking user as absent:', error)
    return NextResponse.json({ error: 'Failed to mark user as absent' }, { status: 500 })
  }
}












