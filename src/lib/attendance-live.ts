/**
 * Shared attendance calculation logic with cutoff-aware status
 * Used by both admin/attendance and payroll APIs to ensure consistency
 */

import { prisma } from '@/lib/prisma'
import { getNowInPhilippines, getTodayRangeInPhilippines } from '@/lib/timezone'
import { calculateAbsenceDeduction, calculateEarnings } from '@/lib/attendance-calculations'

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'PENDING' | 'PARTIAL'

export interface LiveAttendanceRecord {
  date: Date
  status: AttendanceStatus
  timeIn: Date | null
  timeOut: Date | null
  workHours: number
  earnings: number
  deductions: number
}

/**
 * Get effective attendance status considering cutoff time
 * This is the single source of truth for attendance status
 */
export async function getEffectiveAttendanceStatus(
  record: {
    date: Date
    status: string
    timeIn: Date | null
    timeOut: Date | null
  },
  basicSalary: number
): Promise<LiveAttendanceRecord> {
  const nowPH = getNowInPhilippines()
  const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
  
  // Get attendance settings
  const settings = await prisma.attendanceSettings.findFirst()
  
  const nowHH = nowPH.getHours().toString().padStart(2, '0')
  const nowMM = nowPH.getMinutes().toString().padStart(2, '0')
  const nowHHmm = `${nowHH}:${nowMM}`
  
  // Check if this record is for today
  const recordDate = new Date(record.date)
  const isToday = recordDate >= startOfToday && recordDate <= endOfToday
  
  // Check if we're before cutoff
  const isBeforeCutoff = settings?.timeOutEnd ? nowHHmm <= settings.timeOutEnd : false
  
  // Determine effective status
  let effectiveStatus: AttendanceStatus = record.status as AttendanceStatus
  
  // IMPORTANT: If it's today, adjust status based on cutoff
  if (isToday && (effectiveStatus === 'ABSENT' || effectiveStatus === 'PENDING')) {
    if (isBeforeCutoff) {
      // Before cutoff - always PENDING
      effectiveStatus = 'PENDING'
    } else {
      // After cutoff - always ABSENT
      effectiveStatus = 'ABSENT'
    }
  }
  
  // Calculate work hours, earnings, and deductions based on effective status
  let workHours = 0
  let earnings = 0
  let deductions = 0
  
  if (effectiveStatus === 'PRESENT') {
    if (record.timeIn) {
      const timeIn = new Date(record.timeIn)
      const timeOut = record.timeOut ? new Date(record.timeOut) : null
      earnings = calculateEarnings(basicSalary, timeIn, timeOut)
      const endTime = timeOut || new Date()
      workHours = (endTime.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
    }
    deductions = 0
  } else if (effectiveStatus === 'LATE') {
    if (record.timeIn) {
      const timeIn = new Date(record.timeIn)
      const timeOut = record.timeOut ? new Date(record.timeOut) : null
      earnings = calculateEarnings(basicSalary, timeIn, timeOut)
      const endTime = timeOut || new Date()
      workHours = (endTime.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
    }
    // Late deductions are stored in database, fetched separately
    deductions = 0
  } else if (effectiveStatus === 'ABSENT') {
    // Only calculate absence deduction if after cutoff
    if (!isToday || !isBeforeCutoff) {
      deductions = await calculateAbsenceDeduction(basicSalary)
    }
    earnings = 0
    workHours = 0
  } else if (effectiveStatus === 'PENDING') {
    // Before cutoff - no earnings or deductions
    earnings = 0
    workHours = 0
    deductions = 0
  } else if (effectiveStatus === 'PARTIAL') {
    if (record.timeIn) {
      const timeIn = new Date(record.timeIn)
      const timeOut = record.timeOut ? new Date(record.timeOut) : null
      earnings = calculateEarnings(basicSalary, timeIn, timeOut)
      workHours = timeOut ? (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60) : 0
    }
    // Partial deductions are calculated separately
    deductions = 0
  }
  
  return {
    date: record.date,
    status: effectiveStatus,
    timeIn: record.timeIn,
    timeOut: record.timeOut,
    workHours: Math.max(0, workHours),
    earnings,
    deductions
  }
}

/**
 * Get live attendance records for a user in a period
 * Returns records with cutoff-aware status and calculations
 */
export async function getLiveAttendanceRecords(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  basicSalary: number
): Promise<LiveAttendanceRecord[]> {
  // Get attendance records from database - include all dates in period
  const records = await prisma.attendance.findMany({
    where: {
      users_id: userId,
      date: { gte: periodStart, lte: periodEnd }
    },
    select: {
      date: true,
      status: true,
      timeIn: true,
      timeOut: true
    },
    orderBy: { date: 'asc' }
  })
  
  // Transform each record with cutoff-aware logic
  const liveRecords: LiveAttendanceRecord[] = []
  
  for (const record of records) {
    const liveRecord = await getEffectiveAttendanceStatus(record, basicSalary)
    liveRecords.push(liveRecord)
  }
  
  return liveRecords
}
