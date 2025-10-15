import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStartOfDayInPhilippines, getEndOfDayInPhilippines, getNowInPhilippines } from "@/lib/timezone"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings || !settings.autoMarkAbsent || !settings.autoMarkLate) {
      return NextResponse.json({ 
        error: 'Auto-marking is not enabled in settings' 
      }, { status: 400 })
    }

    const results = {
      absentMarked: 0,
      lateMarked: 0,
      processed: 0,
      errors: [] as string[]
    }

    // Process each day in the current period
    if (settings.periodStart && settings.periodEnd) {
      const currentDate = new Date(settings.periodStart)
      const endDate = new Date(settings.periodEnd)
      const today = getNowInPhilippines()

      while (currentDate <= endDate && currentDate < today) {
        // Skip Sundays
        if (currentDate.getDay() !== 0) {
          const dayResult = await processDayAttendance(currentDate, settings)
          results.absentMarked += dayResult.absentMarked
          results.lateMarked += dayResult.lateMarked
          results.processed++
          
          if (dayResult.error) {
            results.errors.push(`${currentDate.toDateString()}: ${dayResult.error}`)
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Auto-processing completed. ${results.absentMarked} marked absent, ${results.lateMarked} marked late across ${results.processed} days.`,
      results
    })
  } catch (error) {
    console.error('Error in auto-process attendance:', error)
    return NextResponse.json({ error: 'Failed to auto-process attendance' }, { status: 500 })
  }
}

async function processDayAttendance(date: Date, settings: any) {
  const result = {
    absentMarked: 0,
    lateMarked: 0,
    error: null as string | null
  }

  try {
    const startOfTargetDay = getStartOfDayInPhilippines(date)
    const endOfTargetDay = getEndOfDayInPhilippines(date)

    // Get all active personnel
    const activePersonnel = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      select: { users_id: true, name: true, email: true }
    })

    // Get existing attendance records for this date
    const existingRecords = await prisma.attendance.findMany({
      where: { 
        date: { gte: startOfTargetDay, lte: endOfTargetDay } 
      }
    })

    const recordMap = new Map(existingRecords.map(r => [r.users_id, r]))

    for (const person of activePersonnel) {
      const record = recordMap.get(person.users_id)

      if (!record) {
        // No record exists - mark as ABSENT
        await prisma.attendance.create({
          data: {
            users_id: person.users_id,
            date: date,
            status: 'ABSENT'
          }
        })
        result.absentMarked++
      } else if (record.status === 'PENDING') {
        // Record exists but still pending
        if (!record.timeIn) {
          // No time-in recorded - check if time-in window has expired
          if (settings.timeInEnd && settings.autoMarkAbsent) {
            const now = getNowInPhilippines()
            const timeInEndToday = new Date(date)
            const [hours, minutes] = settings.timeInEnd.split(':').map(Number)
            timeInEndToday.setHours(hours, minutes, 0, 0)
            
            // Only mark as ABSENT if time-in window has expired
            if (now > timeInEndToday) {
              await prisma.attendance.update({
                where: { attendances_id: record.attendances_id },
                data: { status: 'ABSENT' }
              })
              result.absentMarked++
            }
          }
        } else {
          // Has time-in but check if late
          const timeInDate = new Date(record.timeIn)
          const graceEndTime = new Date(date)
          
          if (settings.timeInEnd) {
            const [hours, minutes] = settings.timeInEnd.split(':').map(Number)
            graceEndTime.setHours(hours, minutes, 0, 0)
            
            if (timeInDate > graceEndTime && settings.autoMarkLate) {
              // Late arrival
              await prisma.attendance.update({
                where: { attendances_id: record.attendances_id },
                data: { status: 'LATE' }
              })
              result.lateMarked++
            } else {
              // On time
              await prisma.attendance.update({
                where: { attendances_id: record.attendances_id },
                data: { status: 'PRESENT' }
              })
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing day ${date.toDateString()}:`, error)
    result.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return result
}

// Helper function that can be called by cron jobs or manual triggers
export async function processCurrentDayAttendance() {
  try {
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings || !settings.autoMarkAbsent) {
      return { success: false, error: 'Auto-marking not enabled' }
    }

    const today = getNowInPhilippines()
    const result = await processDayAttendance(today, settings)
    
    return { success: true, result }
  } catch (error) {
    console.error('Error processing current day attendance:', error)
    return { success: false, error: 'Failed to process current day' }
  }
}
