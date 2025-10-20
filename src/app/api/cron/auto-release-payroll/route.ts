import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Cron job endpoint to automatically release payroll at the scheduled time
 * This should be called every minute by a cron service (e.g., Vercel Cron, external cron job)
 * or every 5-10 minutes for less frequent checks
 */
export async function GET() {
  try {
    // Get attendance settings to check if it's time to release
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings?.periodStart || !settings?.periodEnd || !settings?.timeOutEnd) {
      return NextResponse.json({
        success: false,
        message: 'No payroll settings configured'
      })
    }

    // Calculate release time (period end date at time-out end time)
    const periodEnd = new Date(settings.periodEnd)
    const [hours, minutes] = settings.timeOutEnd.split(':').map(Number)
    periodEnd.setHours(hours, minutes, 0, 0)
    
    // Get current time in Philippines timezone
    const now = new Date()
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    
    // Check if it's time to release
    if (phTime < periodEnd) {
      return NextResponse.json({
        success: true,
        message: 'Not yet time to release payroll',
        releaseTime: periodEnd.toISOString(),
        currentTime: phTime.toISOString(),
        hoursRemaining: (periodEnd.getTime() - phTime.getTime()) / (1000 * 60 * 60)
      })
    }

    // Check if there are pending payroll entries
    const pendingPayrolls = await prisma.payrollEntry.findMany({
      where: {
        periodStart: { gte: new Date(settings.periodStart) },
        periodEnd: { lte: new Date(settings.periodEnd) },
        status: 'PENDING'
      }
    })

    if (pendingPayrolls.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending payrolls to release'
      })
    }

    console.log(`🚀 Auto-releasing ${pendingPayrolls.length} pending payroll entries...`)

    // Call the auto-release API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/payroll/auto-release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    console.log('✅ Auto-release completed:', result.message)
    
    return NextResponse.json({
      success: true,
      message: 'Auto-release executed successfully',
      result
    })
  } catch (error) {
    console.error('❌ Auto-release cron error:', error)
    return NextResponse.json({
      success: false,
      error: 'Auto-release cron failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Allow POST as well for manual triggering
export async function POST() {
  return GET()
}
