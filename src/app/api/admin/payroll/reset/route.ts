import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Reset payroll state - archives released entries and sets up next period
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Archive all released payroll entries
    await prisma.payrollEntry.updateMany({
      where: { status: 'RELEASED' },
      data: { status: 'ARCHIVED' }
    })

    // Delete pending entries with invalid dates (start = end)
    await prisma.payrollEntry.deleteMany({
      where: {
        periodStart: { equals: prisma.payrollEntry.fields.periodEnd }
      }
    })

    // Get current settings
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings) {
      return NextResponse.json({ error: 'No settings found' }, { status: 404 })
    }

    // Calculate next semi-monthly period (15 days)
    const today = new Date()
    const periodStart = new Date(today)
    periodStart.setHours(0, 0, 0, 0)
    
    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodStart.getDate() + 14)
    periodEnd.setHours(23, 59, 59, 999)

    // Update settings with correct period
    await prisma.attendanceSettings.update({
      where: { attendance_settings_id: settings.attendance_settings_id },
      data: {
        periodStart,
        periodEnd
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payroll state reset successfully',
      newPeriod: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      }
    })

  } catch (error) {
    console.error('Error resetting payroll:', error)
    return NextResponse.json(
      { error: 'Failed to reset payroll state' },
      { status: 500 }
    )
  }
}
