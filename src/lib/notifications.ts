import { prisma } from "@/lib/prisma"

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  isRead: boolean
  createdAt: Date
  userId?: string
}

export async function createNotification(data: {
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  userId?: string
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
    userId: data.userId
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









