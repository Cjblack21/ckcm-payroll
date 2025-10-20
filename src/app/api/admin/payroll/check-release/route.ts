import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminId = session.user.id

    // Get attendance settings to check release time
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings?.periodStart || !settings?.periodEnd || !settings?.timeOutEnd) {
      return NextResponse.json({ success: false, message: 'No settings configured' })
    }

    // Store non-null values
    const periodStartDate = settings.periodStart
    const periodEndDate = settings.periodEnd
    const timeOutEnd = settings.timeOutEnd

    // Calculate release time (period end date at time-out end time)
    // Use Philippines timezone (Asia/Manila, UTC+8) for accurate comparison
    const periodEnd = new Date(periodEndDate)
    const [hours, minutes] = timeOutEnd.split(':').map(Number)
    periodEnd.setHours(hours, minutes, 0, 0)
    
    // Get current time in Philippines timezone
    const now = new Date()
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const canRelease = phTime >= periodEnd
    
    // Calculate time differences
    const timeUntilRelease = periodEnd.getTime() - now.getTime()
    const hoursUntilRelease = timeUntilRelease / (1000 * 60 * 60)
    
    // Check if payroll exists and is not released
    const pendingPayroll = await prisma.payrollEntry.findFirst({
      where: {
        periodStart: { gte: new Date(periodStartDate) },
        periodEnd: { lte: new Date(periodEndDate) },
        status: 'PENDING'
      }
    })

    if (pendingPayroll) {
      const periodStart = new Date(periodStartDate).toLocaleDateString()
      const periodEndStr = new Date(periodEndDate).toLocaleDateString()
      const releaseTimeStr = timeOutEnd
      
      // 24 hours before release (between 24h and 23h before)
      if (hoursUntilRelease <= 24 && hoursUntilRelease > 23) {
        await createNotification({
          title: '🔔 Payroll Release Tomorrow',
          message: `Payroll for ${periodStart} - ${periodEndStr} will be automatically released tomorrow at ${releaseTimeStr}.`,
          type: 'info',
          userId: adminId,
          link: '/admin/payroll'
        })
        console.log('✅ Sent 24-hour reminder notification to admin')
      }
      
      // 1 hour before release (between 1h and 59min before)
      if (hoursUntilRelease <= 1 && hoursUntilRelease > 0.98) {
        await createNotification({
          title: '🔔 Payroll Release in 1 Hour',
          message: `Payroll for ${periodStart} - ${periodEndStr} will be automatically released at ${releaseTimeStr}. Please ensure all attendance is verified.`,
          type: 'warning',
          userId: adminId,
          link: '/admin/payroll'
        })
        console.log('✅ Sent 1-hour reminder notification to admin')
      }
      
      // Release ready notification (when countdown hits zero)
      if (canRelease && hoursUntilRelease <= 0 && hoursUntilRelease > -1) {
        await createNotification({
          title: '✅ Payroll Ready to Release!',
          message: `Payroll for ${periodStart} - ${periodEndStr} is now ready to be released. Click here to go to the payroll page.`,
          type: 'success',
          userId: adminId,
          link: '/admin/payroll'
        })
        console.log('✅ Sent release-ready notification to admin')
      }
    }

    return NextResponse.json({ 
      success: true, 
      canRelease,
      notificationSent: false,
      releaseTime: timeOutEnd
    })

  } catch (error) {
    console.error('Error checking payroll release:', error)
    return NextResponse.json({ error: 'Failed to check release status' }, { status: 500 })
  }
}
