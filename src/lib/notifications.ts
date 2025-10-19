import { prisma } from "@/lib/prisma"

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  isRead: boolean
  createdAt: Date
  userId?: string
  link?: string // Optional link to redirect when notification is clicked
}

export async function createNotification(data: {
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  userId?: string
  link?: string
}) {
  // For now, we'll store notifications in memory
  // In production, you'd want to store these in the database
  const notification: Notification = {
    id: Math.random().toString(36).substr(2, 9),
    title: data.title,
    message: data.message,
    type: data.type,
    isRead: false,
    createdAt: new Date(),
    userId: data.userId,
    link: data.link
  }

  // Store in global notifications array (in production, use database)
  if (!global.notifications) {
    global.notifications = []
  }
  global.notifications.push(notification)

  return notification
}

export async function getNotifications(userId?: string): Promise<Notification[]> {
  const notifications: Notification[] = []

  try {
    // Guard
    if (!userId) return notifications

    // Today attendance status
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
    const todayAttendance = await prisma.attendance.findFirst({
      where: { users_id: userId, date: { gte: todayStart, lte: todayEnd } }
    })
    if (todayAttendance) {
      const status = todayAttendance.status
      if (status === 'LATE') {
        notifications.push({
          id: `att-${todayAttendance.attendances_id}`,
          title: 'Late Arrival Recorded',
          message: 'You were marked late today. Please review your time-in.',
          type: 'warning',
          isRead: false,
          createdAt: new Date()
        })
      } else if (status === 'ABSENT') {
        notifications.push({
          id: `att-${todayAttendance.attendances_id}`,
          title: 'Absence Recorded',
          message: 'You are marked absent today.',
          type: 'error',
          isRead: false,
          createdAt: new Date()
        })
      } else if (status === 'PRESENT') {
        notifications.push({
          id: `att-${todayAttendance.attendances_id}`,
          title: 'Attendance Recorded',
          message: 'Your attendance for today has been recorded.',
          type: 'success',
          isRead: false,
          createdAt: new Date()
        })
      }
    }

    // Current period (align with attendance settings and cap to today)
    const settings = await prisma.attendanceSettings.findFirst()
    let periodStart: Date
    let periodEnd: Date
    const now = new Date()
    if (settings?.periodStart && settings?.periodEnd) {
      periodStart = new Date(settings.periodStart)
      periodEnd = new Date(settings.periodEnd)
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    periodEnd.setHours(23,59,59,999)
    const todayEOD = new Date(); todayEOD.setHours(23,59,59,999)
    if (periodEnd > todayEOD) periodEnd = todayEOD

    // Payroll entry for this period
    const payroll = await prisma.payrollEntry.findFirst({
      where: {
        users_id: userId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd }
      },
      orderBy: { processedAt: 'desc' }
    })
    if (payroll) {
      if (payroll.status === 'RELEASED') {
        notifications.push({
          id: `pay-${payroll.payroll_entries_id}`,
          title: 'Payroll Released',
          message: 'Your payroll for the current period has been released.',
          type: 'success',
          isRead: false,
          createdAt: payroll.releasedAt || new Date()
        })
      } else if (payroll.status === 'PENDING') {
        notifications.push({
          id: `pay-${payroll.payroll_entries_id}`,
          title: 'Payroll Pending',
          message: 'Your payroll for the current period is pending release.',
          type: 'info',
          isRead: false,
          createdAt: payroll.processedAt
        })
      }
    }

    // Leave request notifications
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { users_id: userId },
      orderBy: { createdAt: 'desc' },
      take: 5 // Show last 5 leave requests
    })
    
    for (const leave of leaveRequests) {
      if (leave.status === 'PENDING') {
        // Show pending leave notification
        const daysSinceRequest = Math.floor((now.getTime() - new Date(leave.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          id: `leave-${leave.leave_requests_id}`,
          title: '⏳ Leave Request Pending',
          message: `Your leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} is awaiting admin approval${daysSinceRequest > 0 ? ` (submitted ${daysSinceRequest} day${daysSinceRequest > 1 ? 's' : ''} ago)` : ''}.`,
          type: 'warning',
          isRead: false,
          createdAt: new Date(leave.createdAt)
        })
      } else if (leave.status === 'APPROVED') {
        // Show approved leave notification (only recent ones)
        const updatedAt = leave.updatedAt || leave.createdAt
        const hoursSinceApproval = Math.floor((now.getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60))
        if (hoursSinceApproval <= 48) { // Show for 48 hours
          notifications.push({
            id: `leave-${leave.leave_requests_id}`,
            title: '✅ Leave Request Approved',
            message: `Your leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been approved!`,
            type: 'success',
            isRead: false,
            createdAt: new Date(updatedAt)
          })
        }
      } else if (leave.status === 'DENIED') {
        // Show denied leave notification (only recent ones)
        const updatedAt = leave.updatedAt || leave.createdAt
        const hoursSinceDenial = Math.floor((now.getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60))
        if (hoursSinceDenial <= 48) { // Show for 48 hours
          notifications.push({
            id: `leave-${leave.leave_requests_id}`,
            title: '❌ Leave Request Denied',
            message: `Your leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} was not approved.${leave.adminComment ? ` Reason: ${leave.adminComment}` : ''}`,
            type: 'error',
            isRead: false,
            createdAt: new Date(updatedAt)
          })
        }
      }
    }

    // Active loans reminder
    const loans = await prisma.loan.findMany({ where: { users_id: userId, status: 'ACTIVE' } })
    if (loans.length > 0) {
      notifications.push({
        id: `loan-${userId}`,
        title: 'Active Loan Deduction',
        message: 'Your active loan will be deducted this payroll.',
        type: 'info',
        isRead: false,
        createdAt: new Date()
      })
    }

    // Payroll period ending notification
    if (settings?.periodEnd) {
      const periodEndDate = new Date(settings.periodEnd)
      const daysUntilEnd = Math.ceil((periodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilEnd >= 0 && daysUntilEnd <= 3) {
        notifications.push({
          id: `period-end-${periodEndDate.getTime()}`,
          title: 'Payroll Period Ending Soon',
          message: `The current payroll period will end ${daysUntilEnd === 0 ? 'today' : `in ${daysUntilEnd} day${daysUntilEnd > 1 ? 's' : ''}`}. Make sure your attendance is up to date.`,
          type: 'warning',
          isRead: false,
          createdAt: new Date()
        })
      }
    }

    // Payroll reschedule notifications from global store
    if (global.notifications) {
      const userNotifications = global.notifications.filter(n => 
        n.userId === userId || !n.userId // Include notifications for this user or general notifications
      )
      notifications.push(...userNotifications)
    }

    // Sort by time desc
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (err) {
    console.error('Notifications error:', err)
  }

  return notifications
}

export async function markNotificationAsRead(notificationId: string) {
  if (!global.notifications) {
    global.notifications = []
  }

  const notification = global.notifications.find(n => n.id === notificationId)
  if (notification) {
    notification.isRead = true
  }
}

export async function markAllNotificationsAsRead() {
  if (!global.notifications) {
    global.notifications = []
  }

  global.notifications.forEach(notification => {
    notification.isRead = true
  })
}

// Extend global type for TypeScript
declare global {
  var notifications: Notification[] | undefined
}









