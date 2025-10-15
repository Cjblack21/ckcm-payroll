import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"
import { calculateAbsenceDeduction } from "@/lib/attendance-calculations"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await request.json()
    
    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const targetDate = new Date(date)
    const startOfTargetDay = startOfDay(targetDate)
    const endOfTargetDay = endOfDay(targetDate)

    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings || settings.noTimeOutCutoff || !settings.timeOutEnd) {
      return NextResponse.json({ 
        error: 'Auto-mark absent is not configured. Time-out restrictions must be enabled with an end time.' 
      }, { status: 400 })
    }

    // Get all active personnel users
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      include: { personnelType: true }
    })

    // Get all existing attendance records for the date
    const existingRecords = await prisma.attendance.findMany({
      where: { 
        date: { gte: startOfTargetDay, lte: endOfTargetDay } 
      },
      select: { users_id: true, status: true }
    })

    const existingUserIds = new Set(existingRecords.map(r => r.users_id))
    const pendingUserIds = existingRecords
      .filter(r => r.status === 'PENDING')
      .map(r => r.users_id)

    // Users who need to be marked as absent
    const usersToMarkAbsent = activeUsers.filter(user => 
      !existingUserIds.has(user.users_id) || pendingUserIds.includes(user.users_id)
    )

    const results = []

    for (const user of usersToMarkAbsent) {
      try {
        // Check if record already exists
        const existingRecord = existingRecords.find(r => r.users_id === user.users_id)
        
        if (existingRecord) {
          // Update existing PENDING record to ABSENT
          const updatedRecord = await prisma.attendance.updateMany({
            where: { 
              users_id: user.users_id,
              date: { gte: startOfTargetDay, lte: endOfTargetDay },
              status: 'PENDING'
            },
            data: { status: 'ABSENT' }
          })
          
          results.push({
            users_id: user.users_id,
            name: user.name,
            email: user.email,
            action: 'updated',
            success: updatedRecord.count > 0
          })
        } else {
          // Create new ABSENT record
          await prisma.attendance.create({
            data: {
              users_id: user.users_id,
              date: targetDate,
              status: 'ABSENT'
            }
          })
          
          results.push({
            users_id: user.users_id,
            name: user.name,
            email: user.email,
            action: 'created',
            success: true
          })
        }
      } catch (error) {
        console.error(`Error processing user ${user.users_id}:`, error)
        results.push({
          users_id: user.users_id,
          name: user.name,
          email: user.email,
          action: 'failed',
          success: false,
          error: 'Failed to process'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({ 
      success: true, 
      message: `Auto-marked ${results.length} users as absent after time-out window closed. ${successCount} successful, ${failureCount} failed.`,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      },
      results
    })
  } catch (error) {
    console.error('Error auto-marking users as absent:', error)
    return NextResponse.json({ error: 'Failed to auto-mark users as absent' }, { status: 500 })
  }
}













