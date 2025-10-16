'use server'

import { prisma } from "@/lib/prisma"
import { 
  parsePhilippinesLocalDate, 
  getNowInPhilippines, 
  getTodayRangeInPhilippines,
  calculateWorkingDaysInPhilippines,
  calculatePeriodDurationInPhilippines,
  generateWorkingDaysInPhilippines,
  toPhilippinesDateString,
  getPhilippinesDayOfWeek
} from '@/lib/timezone'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, subDays } from "date-fns"
import { revalidatePath } from "next/cache"
import { calculateLateDeductionSync, calculateAbsenceDeductionSync, calculateEarnings } from "@/lib/attendance-calculations-sync"
// import { calculatePartialDeduction } from "@/lib/attendance-calculations-sync"

// Types
export type PayrollSummary = {
  periodStart: string
  periodEnd: string
  totalEmployees: number
  totalGrossSalary: number
  totalDeductions: number
  totalNetSalary: number
  workingDays: string[]
  payrollEntries: PayrollEntry[]
  hasGenerated: boolean
  hasReleased: boolean
  settings: {
    periodStart: string
    periodEnd: string
    hasGeneratedForSettings: boolean
    timeOutEnd?: string | null
  }
}

export type PayrollEntry = {
  users_id: string
  name: string | null
  email: string
  personnelType: {
    name: string
    basicSalary: number
  } | null
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  totalWorkHours: number
  grossSalary: number
  totalDeductions: number
  netSalary: number
  status: 'Pending' | 'Released' | 'Archived'
  attendanceRecords: AttendanceRecord[]
  deductionDetails: DeductionDetail[]
  loanPayments: number
  // Separate deduction breakdowns for frontend
  attendanceDeductions: number
  databaseDeductions: number
  unpaidLeaveDeduction: number
  unpaidLeaveDays: number
}

export type DeductionDetail = {
  id: string
  amount: number
  type: string
  description: string | null
  appliedAt: string
  notes: string | null
}

export type AttendanceRecord = {
  date: string
  timeIn: string | null
  timeOut: string | null
  status: string
  workHours: number
  earnings: number
  deductions: number
}

export type PayrollSchedule = {
  periodStart: string
  periodEnd: string
  totalEmployees: number
  totalGrossSalary: number
  totalDeductions: number
  totalNetSalary: number
  workingDays: string[]
  payrollEntries: PayrollEntry[]
}

// Server Action: Get Payroll Summary
export async function getPayrollSummary(): Promise<{
  success: boolean
  summary?: PayrollSummary
  error?: string
}> {
  try {
    console.log('🔍 Payroll Summary - Starting function execution')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Get attendance period settings to align payroll with attendance system
    console.log('🔍 Payroll Summary - Fetching attendance settings')
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    console.log('🔍 Payroll Summary - Attendance settings found:', !!attendanceSettings)
    
    // Debug: Check what deduction types exist in the database (no auto-creation)
    const allDeductionTypes = await prisma.deductionType.findMany()
    console.log('🔍 All Deduction Types in Database:', allDeductionTypes.map(dt => `${dt.name}: ₱${dt.amount} (Active: ${dt.isActive})`))
    
    let periodStart: Date
    let periodEnd: Date
    
    if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
      // Use attendance period settings for payroll period
      periodStart = new Date(attendanceSettings.periodStart)
      periodEnd = new Date(attendanceSettings.periodEnd)
      console.log(`🔧 Payroll period aligned with attendance period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
    } else {
      // Fallback to current month if no attendance settings
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      periodStart = new Date(currentYear, currentMonth, 1)
      periodEnd = new Date(currentYear, currentMonth + 1, 0)
      console.log(`🔧 Payroll period fallback to current month: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
    }

    // Preserve settings period separately for UI logic (Generate button state)
    const settingsPeriodStart = new Date(periodStart)
    const settingsPeriodEnd = new Date(periodEnd)

    // Decide which period to DISPLAY in the summary:
    // - If the settings period has generated entries, display the settings period
    // - Else, fall back to latest non-archived period with stored entries (so release doesn't blank the page)
    const settingsHasEntries = await prisma.payrollEntry.count({
      where: { periodStart: settingsPeriodStart, periodEnd: settingsPeriodEnd }
    })
    
    if (!settingsHasEntries) {
      // Check if we're in a fresh generation context (settings were recently updated)
      const isRecentGeneration = attendanceSettings?.updatedAt && 
        (new Date().getTime() - new Date(attendanceSettings.updatedAt).getTime()) < 300000 // Within last 5 minutes
      
      if (isRecentGeneration) {
        // If settings were recently updated (likely from Generate Payroll), use the settings period
        console.log('🔧 Using settings period for fresh generation context')
        // periodStart and periodEnd are already set to settings period above
      } else {
        // Look for the most recent period with entries, prioritizing RELEASED over PENDING
        const latestReleased = await prisma.payrollEntry.findFirst({
          where: { status: 'RELEASED' },
          orderBy: { periodEnd: 'desc' },
          select: { periodStart: true, periodEnd: true }
        })
        
        const latestPending = await prisma.payrollEntry.findFirst({
          where: { status: 'PENDING' },
          orderBy: { periodEnd: 'desc' },
          select: { periodStart: true, periodEnd: true }
        })
        
        // Prefer RELEASED entries over PENDING entries
        const latestNonArchived = latestReleased || latestPending
        if (latestNonArchived) {
          periodStart = latestNonArchived.periodStart
          periodEnd = latestNonArchived.periodEnd
        }
      }
    }

    console.log('Period dates:', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    })
    const periodDays = calculatePeriodDurationInPhilippines(periodStart, periodEnd)
    const perPayrollFactor = periodDays <= 16 ? 0.5 : 1.0

    // Get all active personnel users
    console.log('🔍 Payroll Summary - Fetching users')
    const users = await prisma.user.findMany({
      where: { 
        isActive: true, 
        role: 'PERSONNEL' 
      },
      include: {
        personnelType: {
          select: {
            name: true,
            basicSalary: true
          }
        }
      }
    })

    console.log('🔍 Payroll Summary - Users found:', users.length)

    // Normalize to full-day range (Philippines) so end-date items are included
    const periodStartDay = new Date(periodStart)
    periodStartDay.setHours(0, 0, 0, 0)
    const periodEndDay = new Date(periodEnd)
    periodEndDay.setHours(23, 59, 59, 999)

    // Get attendance records for the period
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: {
          gte: periodStartDay,
          lte: periodEndDay
        }
      },
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      }
    })

    console.log('Attendance records found:', attendanceRecords.length)

    // Load any existing payroll entries for this period to surface real statuses (Pending/Released/Archived)
    const existingPayrollEntries = await prisma.payrollEntry.findMany({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd
      },
      select: {
        users_id: true,
        status: true
      }
    })
    const usersIdToStatus = new Map<string, 'Pending' | 'Released' | 'Archived'>()
    existingPayrollEntries.forEach(e => {
      const mapped = e.status === 'RELEASED' ? 'Released' : e.status === 'ARCHIVED' ? 'Archived' : 'Pending'
      usersIdToStatus.set(e.users_id, mapped)
    })
    const hasGenerated = existingPayrollEntries.length > 0
    const hasReleased = existingPayrollEntries.some(e => e.status === 'RELEASED')

    // Use Philippines timezone for working days calculation
    let workingDaysInPeriod = 22 // Default fallback
    if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
      workingDaysInPeriod = calculateWorkingDaysInPhilippines(
        new Date(attendanceSettings.periodStart), 
        new Date(attendanceSettings.periodEnd)
      )
    }
    
    console.log('🔍 WORKING DAYS DEBUG - Using Same Logic as Attendance System')
    console.log('🔍 WORKING DAYS DEBUG - Working Days in Period:', workingDaysInPeriod)
    
    // Generate working days array for the period using Philippines timezone
    const today = getNowInPhilippines() // Use Philippines timezone
    const workingDays = generateWorkingDaysInPhilippines(periodStart, periodEnd)
      .filter(day => day <= toPhilippinesDateString(today)) // Only include days up to today

    // Create attendance map for quick lookup
    const attendanceMap = new Map<string, any>()
    attendanceRecords.forEach(record => {
      const key = `${record.users_id}-${record.date.toISOString().split('T')[0]}`
      attendanceMap.set(key, record)
    })

    // If payroll entries exist for the display period, use the STORED values to freeze amounts
    // This prevents net pay from changing when Attendance Settings period is adjusted after release
    let payrollEntries: PayrollEntry[] = []
    let totalGrossSalary = 0
    let totalDeductions = 0
    let totalNetSalary = 0

    const storedEntriesForPeriod = await prisma.payrollEntry.findMany({
      where: { periodStart: periodStart, periodEnd: periodEnd },
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnelType: { select: { name: true, basicSalary: true } }
          }
        }
      }
    })

    if (storedEntriesForPeriod.length > 0) {
      // Freeze to stored amounts, but reconstruct supporting breakdown (work hours, attendance, deductions, loans)
      const attendanceSettings = await prisma.attendanceSettings.findFirst()

      // Working days in period using Philippines timezone
      let workingDaysInPeriod = 22
      if (attendanceSettings?.periodStart && attendanceSettings?.periodEnd) {
        workingDaysInPeriod = calculateWorkingDaysInPhilippines(
          new Date(attendanceSettings.periodStart), 
          new Date(attendanceSettings.periodEnd)
        )
      }

      const periodDays = calculatePeriodDurationInPhilippines(periodStart, periodEnd)
      const perPayrollFactor = periodDays <= 16 ? 0.5 : 1.0

      const rebuilt: PayrollEntry[] = []
      for (const se of storedEntriesForPeriod) {
        // Attendance records for period
        const att = await prisma.attendance.findMany({
          where: {
            users_id: se.users_id,
            date: { gte: periodStart, lte: periodEnd }
          },
          orderBy: { date: 'asc' }
        })

        // Compute total work hours and rebuild attendanceRecords with per-day deductions (so UI can display them)
        let totalWorkHours = 0
        const attendanceRecords = att.map(r => {
          let hours = 0
          if (r.timeIn && r.timeOut) {
            const ti = new Date(r.timeIn)
            const to = new Date(r.timeOut)
            hours = Math.max(0, (to.getTime() - ti.getTime()) / (1000 * 60 * 60))
          }
          totalWorkHours += hours

          // Compute per-record deduction mirroring attendance rules
          let recordDeduction = 0
          if (r.status === 'LATE' && r.timeIn) {
            const ti = new Date(r.timeIn)
            const expected = new Date(r.date)
            const [h, m] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
            // Keep the +1 minute tolerance used by stored-entry path to match older logic
            const m2 = m + 1
            if (m2 >= 60) expected.setHours(h + 1, m2 - 60, 0, 0)
            else expected.setHours(h, m2, 0, 0)
            const perSec = (se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)) / workingDaysInPeriod / 8 / 60 / 60
            const seconds = Math.max(0, (ti.getTime() - expected.getTime()) / 1000)
            const daily = (se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)) / workingDaysInPeriod
            recordDeduction = Math.min(seconds * perSec, daily * 0.5)
          } else if (r.status === 'ABSENT') {
            const daily = (se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)) / workingDaysInPeriod
            recordDeduction = daily
          } else if (r.status === 'PARTIAL') {
            const basic = se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)
            const daily = basic / workingDaysInPeriod
            const hourly = daily / 8
            // Hours short from expected 8
            const hoursShort = Math.max(0, 8 - hours)
            recordDeduction = hoursShort * hourly
          }

          return {
            date: r.date.toISOString().split('T')[0],
            timeIn: r.timeIn?.toISOString() || null,
            timeOut: r.timeOut?.toISOString() || null,
            status: r.status,
            workHours: hours,
            earnings: 0,
            deductions: recordDeduction,
          }
        }) as any

        // Non-attendance deductions for period
        const periodDeductions = await prisma.deduction.findMany({
          where: {
            users_id: se.users_id,
            appliedAt: { gte: periodStart, lte: periodEnd }
          },
          include: { deductionType: { select: { name: true, description: true } } },
          orderBy: { appliedAt: 'desc' }
        })
        const nonAttendance = periodDeductions.filter(d =>
          !d.deductionType.name.includes('Late') &&
          !d.deductionType.name.includes('Absent') &&
          !d.deductionType.name.includes('Early') &&
          !d.deductionType.name.includes('Partial') &&
          !d.deductionType.name.includes('Tardiness')
        )
        let databaseDeductions = nonAttendance.reduce((sum, d) => sum + Number(d.amount), 0)
        let deductionDetails = nonAttendance.map(d => ({
          id: (d as any).deductions_id || '',
          amount: Number(d.amount),
          type: d.deductionType.name,
          description: d.deductionType.description || null,
          appliedAt: d.appliedAt.toISOString(),
          notes: d.notes || null,
        })) as any

        // Fallback: if no period-specific non-attendance deductions, use latest per type (standing deductions)
        if (databaseDeductions === 0) {
          const latestUserDeductions = await prisma.deduction.findMany({
            where: { users_id: se.users_id },
            include: { deductionType: { select: { name: true, description: true } } },
            orderBy: { appliedAt: 'desc' }
          })
          const seen = new Set<string>()
          const latestPerType = latestUserDeductions.filter(d => {
            const name = d.deductionType.name
            const isAttendance = name.includes('Late') || name.includes('Absent') || name.includes('Early') || name.includes('Partial') || name.includes('Tardiness')
            if (isAttendance) return false
            if (seen.has(name)) return false
            seen.add(name)
            return true
          })
          if (latestPerType.length > 0) {
            databaseDeductions = latestPerType.reduce((sum, d) => sum + Number(d.amount), 0)
            deductionDetails = latestPerType.map(d => ({
              id: (d as any).deductions_id || '',
              amount: Number(d.amount),
              type: d.deductionType.name,
              description: d.deductionType.description || null,
              appliedAt: d.appliedAt.toISOString(),
              notes: d.notes || null,
            })) as any
          }
        }

        // Loans
        const loans = await prisma.loan.findMany({
          where: { users_id: se.users_id, status: 'ACTIVE' },
          select: { amount: true, monthlyPaymentPercent: true }
        })
        const loanPayments = loans.reduce((sum, l) => {
          const monthly = (Number(l.amount) * Number(l.monthlyPaymentPercent)) / 100
          return sum + monthly * perPayrollFactor
        }, 0)

        // Attendance deductions estimate using stored user's salary and timeInEnd
        const basicSalary = se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)
        const timeInEnd = attendanceSettings?.timeInEnd || '09:30'
        let attendanceDeductions = 0
        for (const r of att) {
          if (r.status === 'LATE' && r.timeIn) {
            const ti = new Date(r.timeIn)
            const expected = new Date(r.date)
            const [h, m] = timeInEnd.split(':').map(Number)
            const m2 = m + 1
            if (m2 >= 60) expected.setHours(h + 1, m2 - 60, 0, 0)
            else expected.setHours(h, m2, 0, 0)
            const perSec = basicSalary / workingDaysInPeriod / 8 / 60 / 60
            const seconds = Math.max(0, (ti.getTime() - expected.getTime()) / 1000)
            const daily = basicSalary / workingDaysInPeriod
            attendanceDeductions += Math.min(seconds * perSec, daily * 0.5)
          } else if (r.status === 'ABSENT') {
            attendanceDeductions += basicSalary / workingDaysInPeriod
          } else if (r.status === 'PARTIAL') {
            let hoursShort = 8
            if (r.timeIn && r.timeOut) {
              const ti = new Date(r.timeIn)
              const to = new Date(r.timeOut)
              const hours = Math.max(0, (to.getTime() - ti.getTime()) / (1000 * 60 * 60))
              hoursShort = Math.max(0, 8 - hours)
            }
            const hourly = (basicSalary / workingDaysInPeriod) / 8
            attendanceDeductions += hoursShort * hourly
          }
        }

        // Compose entry using STORED totals and rebuilt breakdown
        rebuilt.push({
          users_id: se.users_id,
          name: se.user?.name || null,
          email: se.user?.email || '',
          personnelType: se.user?.personnelType ? {
            name: se.user.personnelType.name,
            basicSalary: Number(se.user.personnelType.basicSalary)
          } : null,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          totalWorkHours,
          grossSalary: se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary),
          totalDeductions: Number(se.deductions),
          netSalary: Number(se.netPay),
          status: se.status === 'RELEASED' ? 'Released' : se.status === 'ARCHIVED' ? 'Archived' : 'Pending',
          attendanceRecords,
          deductionDetails,
          loanPayments,
          attendanceDeductions,
          databaseDeductions,
          unpaidLeaveDeduction: 0, // For stored entries, unpaid leave is already in totalDeductions
          unpaidLeaveDays: 0,
        })
      }

      payrollEntries = rebuilt
      totalGrossSalary = payrollEntries.reduce((s, e) => s + e.grossSalary, 0)
      totalDeductions = payrollEntries.reduce((s, e) => s + e.totalDeductions, 0)
      totalNetSalary = payrollEntries.reduce((s, e) => s + e.netSalary, 0)
    } else {
      // No stored entries yet → compute live preview for generation
      // Process each user
      const computedEntries: PayrollEntry[] = []
      let compTotalGross = 0
      let compTotalDeductions = 0
      let compTotalNet = 0

    for (const user of users) {
      if (!user.personnelType?.basicSalary) continue

      const basicSalary = parseFloat(user.personnelType.basicSalary.toString())
      // Calculate daily salary based on actual working days in the period
      const totalWorkingDaysInPeriod = workingDaysInPeriod
      const dailySalary = totalWorkingDaysInPeriod > 0 ? basicSalary / totalWorkingDaysInPeriod : 0
      
      console.log(`🔍 Payroll Debug - User: ${user.name}, Basic Salary: ₱${basicSalary.toFixed(2)}, Daily Salary: ₱${dailySalary.toFixed(2)}, Working Days: ${totalWorkingDaysInPeriod}`)
      
      let totalDays = 0
      let presentDays = 0
      let absentDays = 0
      let lateDays = 0
      let grossSalary = 0 // Will be calculated as basic salary for the period
      let totalUserDeductions = 0 // Will be replaced by database deductions
      let totalWorkHours = 0
      const userAttendanceRecords: AttendanceRecord[] = []

      // Process each working day using Philippines timezone
      const checkDate = new Date(periodStart)
      const todayForUser = getNowInPhilippines() // Use Philippines timezone for each user
      while (checkDate <= periodEnd && checkDate <= todayForUser) {
        const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' })
        
        if (getPhilippinesDayOfWeek(checkDate) !== 0) { // Exclude Sundays only using Philippines timezone
          totalDays++
          const dateKey = toPhilippinesDateString(checkDate)
          const attendanceKey = `${user.users_id}-${dateKey}`
          const attendance = attendanceMap.get(attendanceKey)
          
          console.log(`🔍 Payroll Day Processing - User: ${user.name}, Date: ${dateKey}, Day: ${dayName}, Has Attendance Record: ${!!attendance}`)

          // Declare variables at higher scope
          let workHours = 0
          let earnings = 0
          let deductions = 0
          
          if (attendance) {
            presentDays++
            
            // Calculate work hours
            if (attendance.timeIn && attendance.timeOut) {
              const timeIn = new Date(attendance.timeIn)
              const timeOut = new Date(attendance.timeOut)
              workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
            }

            // RECALCULATE STATUS and deductions using same logic as attendance system
            let calculatedStatus = attendance.status
            
            // First check if this is a past day with PENDING status - should be ABSENT
            const isPastDay = checkDate < todayForUser
            if (isPastDay && attendance.status === 'PENDING') {
              calculatedStatus = 'ABSENT'
              console.log(`🔍 Payroll Status Check - User: ${user.name}, Date: ${dateKey}`)
              console.log(`🔍 Payroll Status Check - Status: ABSENT (past day with PENDING status)`)
            } else if (attendance.timeIn) {
              const timeIn = new Date(attendance.timeIn)
              // Create expected time-in using Philippines timezone for the specific date
              const expectedTimeIn = new Date(checkDate)
              const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
              // Use the exact timeInEnd (no +1 minute adjustment for payroll calculations)
              expectedTimeIn.setHours(hours, minutes, 0, 0)
              
              console.log(`🔍 Payroll Status Check - User: ${user.name}, Date: ${dateKey}`)
              console.log(`🔍 Payroll Status Check - TimeIn: ${timeIn.toISOString()}`)
              console.log(`🔍 Payroll Status Check - Expected: ${expectedTimeIn.toISOString()}`)
              
              // Check if user was late using same logic as attendance system
              if (timeIn > expectedTimeIn) {
                calculatedStatus = 'LATE'
                console.log(`🔍 Payroll Status Check - Status: LATE (${Math.round((timeIn.getTime() - expectedTimeIn.getTime()) / 1000 / 60)} minutes late)`)
              } else {
                calculatedStatus = 'PRESENT'
                console.log(`🔍 Payroll Status Check - Status: PRESENT (on time)`)
              }
            }

            // Calculate earnings and deductions based on RECALCULATED status
            if (calculatedStatus === 'PRESENT') {
              // Use attendance system's earnings calculation for consistency
              if (attendance.timeIn) {
                const timeIn = new Date(attendance.timeIn)
                const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
                earnings = calculateEarnings(basicSalary, timeIn, timeOut)
              } else {
                earnings = dailySalary
              }
              // No deductions for present
              deductions = 0
            } else if (calculatedStatus === 'LATE') {
              // Use attendance system's earnings calculation for consistency
              if (attendance.timeIn) {
                const timeIn = new Date(attendance.timeIn)
                const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
                earnings = calculateEarnings(basicSalary, timeIn, timeOut)
              } else {
                earnings = dailySalary
              }
              // Calculate late deduction using the same logic as attendance system
              const timeIn = new Date(attendance.timeIn!)
              const expectedTimeIn = new Date(checkDate)
              const [hours, minutes] = (attendanceSettings?.timeInEnd || '09:30').split(':').map(Number)
              // Use the exact timeInEnd for payroll calculations (consistent with status check above)
              expectedTimeIn.setHours(hours, minutes, 0, 0)
              
              // Use the same calculation function as attendance system
              deductions = calculateLateDeductionSync(basicSalary, timeIn, expectedTimeIn, totalWorkingDaysInPeriod)
              lateDays++
              
              console.log(`🔍 Payroll Late Debug - User: ${user.name}, Date: ${dateKey}, Calculated Deduction: ₱${deductions.toFixed(2)}`)
              console.log(`🔍 Payroll Late Debug - Basic Salary: ₱${basicSalary}, Working Days: ${totalWorkingDaysInPeriod}`)
              console.log(`🔍 Payroll Late Debug - TimeIn: ${timeIn.toISOString()}, Expected: ${expectedTimeIn.toISOString()}`)
              console.log(`🔍 Payroll Late Debug - Seconds Late: ${Math.max(0, (timeIn.getTime() - expectedTimeIn.getTime()) / 1000)}`)
              console.log(`🔍 Payroll Late Debug - Per Second Rate: ₱${(basicSalary / totalWorkingDaysInPeriod / 8 / 60 / 60).toFixed(6)}`)
            } else if (calculatedStatus === 'ABSENT') {
              earnings = 0
              // Calculate absence deduction using the same logic as attendance system
              deductions = calculateAbsenceDeductionSync(basicSalary, totalWorkingDaysInPeriod)
              absentDays++
            } else if (calculatedStatus === 'PARTIAL') {
              // Pro-rated earnings based on actual work hours
              earnings = dailySalary * (workHours / 8)
              // Calculate partial deduction using the same logic as attendance system
              // deductions = calculatePartialDeduction(basicSalary, workHours, 8, totalWorkingDaysInPeriod)
              // Temporary simple calculation
              const dailyEarnings = basicSalary / totalWorkingDaysInPeriod
              const hourlyRate = dailyEarnings / 8
              const hoursShort = Math.max(0, 8 - workHours)
              deductions = hoursShort * hourlyRate
            }

            userAttendanceRecords.push({
              date: dateKey,
              timeIn: attendance.timeIn?.toISOString() || null,
              timeOut: attendance.timeOut?.toISOString() || null,
              status: calculatedStatus,
              workHours,
              earnings,
              deductions
            })

            // Don't accumulate gross salary here - will be set to basic salary for period
            totalWorkHours += workHours
            
            console.log(`🔍 Daily Calculation - User: ${user.name}, Date: ${dateKey}, Status: ${calculatedStatus}, Work Hours: ${workHours.toFixed(2)}`)
          } else {
            // No attendance record - check if should be PENDING or ABSENT
            console.log(`🔍 Payroll No Record Processing - User: ${user.name}, Date: ${dateKey}, Day: ${dayName}`)
            
            let statusForNoRecord = 'ABSENT'
            let deductionsForNoRecord = 0
            
            // Check if current day and still within time-out window (should be PENDING)
            const isCurrentDay = checkDate.toDateString() === todayForUser.toDateString()
            if (isCurrentDay && attendanceSettings?.timeOutEnd) {
              const currentTime = getNowInPhilippines()
              // Create time-out end time for today in Philippines timezone
              const timeOutEnd = new Date(checkDate)
              const [hours, minutes] = attendanceSettings.timeOutEnd.split(':').map(Number)
              timeOutEnd.setHours(hours, minutes, 0, 0)
              
              console.log(`🔍 Payroll PENDING Check - User: ${user.name}, Date: ${dateKey}`)
              console.log(`🔍 Payroll PENDING Check - Current Time: ${currentTime.toISOString()}`)
              console.log(`🔍 Payroll PENDING Check - TimeOut End: ${timeOutEnd.toISOString()}`)
              console.log(`🔍 Payroll PENDING Check - Is Current Day: ${isCurrentDay}`)
              
              if (currentTime <= timeOutEnd) {
                // Still within time-out window - should be PENDING
                statusForNoRecord = 'PENDING'
                deductionsForNoRecord = 0
                console.log(`🔍 Payroll PENDING Check - Status: PENDING (within time-out window)`)
              } else {
                // Past time-out window - should be ABSENT
                statusForNoRecord = 'ABSENT'
                deductionsForNoRecord = calculateAbsenceDeductionSync(basicSalary, totalWorkingDaysInPeriod)
                absentDays++
                console.log(`🔍 Payroll PENDING Check - Status: ABSENT (past time-out window), Deduction: ₱${deductionsForNoRecord.toFixed(2)}`)
              }
            } else {
              // Not current day - should be ABSENT
              statusForNoRecord = 'ABSENT'
              deductionsForNoRecord = calculateAbsenceDeductionSync(basicSalary, totalWorkingDaysInPeriod)
              absentDays++
              console.log(`🔍 Payroll No Record - Status: ABSENT (not current day), Deduction: ₱${deductionsForNoRecord.toFixed(2)}`)
            }
            
            totalUserDeductions += deductionsForNoRecord
            
            userAttendanceRecords.push({
              date: dateKey,
              timeIn: null,
              timeOut: null,
              status: statusForNoRecord,
              workHours: 0,
              earnings: 0,
              deductions: deductionsForNoRecord
            })
            
            console.log(`🔍 No Record Day - User: ${user.name}, Date: ${dateKey}, Status: ${statusForNoRecord}, Deductions: ₱${deductionsForNoRecord.toFixed(2)}`)
          }
        }
        
        checkDate.setDate(checkDate.getDate() + 1)
      }

      // Get comprehensive deduction details for this user (including attendance deductions)
      const deductionDetails = await prisma.deduction.findMany({
        where: {
          users_id: user.users_id,
          appliedAt: {
            gte: periodStartDay,
            lte: periodEndDay
          }
        },
        include: {
          deductionType: {
            select: {
              name: true,
              description: true
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      })

      // Set gross salary to basic salary for the full duration period
      grossSalary = basicSalary // Full period salary (not split in half)
      
      // Calculate total deductions from database (excluding attendance deductions)
      // Maintain full decimal precision by using parseFloat instead of Number()
      let periodNonAttendanceDeductions = deductionDetails.filter(d =>
        !d.deductionType.name.includes('Late') &&
        !d.deductionType.name.includes('Absent') &&
        !d.deductionType.name.includes('Early')
      )

      let totalDatabaseDeductions = periodNonAttendanceDeductions.reduce((sum, deduction) => {
        return sum + parseFloat(deduction.amount.toString())
      }, 0)

      // Fallback: if the user has no period deductions but has assigned deductions historically,
      // apply the most recent deduction per type (treat as standing/recurring assignment) WITHOUT creating new rows
      if (totalDatabaseDeductions === 0) {
        const latestUserDeductions = await prisma.deduction.findMany({
          where: { users_id: user.users_id },
          include: { deductionType: { select: { name: true, description: true } } },
          orderBy: { appliedAt: 'desc' }
        })

        const seenType = new Set<string>()
        const latestPerType: typeof latestUserDeductions = []
        for (const d of latestUserDeductions) {
          if (
            !d.deductionType.name.includes('Late') &&
            !d.deductionType.name.includes('Absent') &&
            !d.deductionType.name.includes('Early')
          ) {
            const key = d.deductionType.name
            if (!seenType.has(key)) {
              seenType.add(key)
              latestPerType.push(d)
            }
          }
        }

        if (latestPerType.length > 0) {
          totalDatabaseDeductions = latestPerType.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0)
          // Also surface these as details so UI shows them
          periodNonAttendanceDeductions = latestPerType
        }
      }

      // Calculate real-time attendance deductions from attendance records
      // IMPORTANT: Use the deductions that were already calculated in the attendance system
      // Don't recalculate them here to avoid inconsistencies
      let totalAttendanceDeductions = 0
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - User: ${user.name}`)
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - Basic Salary: ₱${basicSalary}`)
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - Working Days in Period: ${totalWorkingDaysInPeriod}`)
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - Attendance Records Count: ${userAttendanceRecords.length}`)
      
      for (const record of userAttendanceRecords) {
        if (record.deductions && record.deductions > 0) {
          console.log(`🔍 PAYROLL ATTENDANCE DEBUG - Record Date: ${record.date}, Status: ${record.status}, Deduction: ₱${record.deductions}`)
          totalAttendanceDeductions += record.deductions
        }
      }
      
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - Total Attendance Deductions: ₱${totalAttendanceDeductions}`)
      
      // Compare with attendance system calculation
      if (user.name === 'Mike Johnson') {
        console.log(`🔍 COMPARISON DEBUG - Mike's Expected Attendance Deduction: ₱5,670.8`)
        console.log(`🔍 COMPARISON DEBUG - Payroll System Calculation: ₱${totalAttendanceDeductions}`)
        console.log(`🔍 COMPARISON DEBUG - Difference: ₱${(totalAttendanceDeductions - 5670.8).toFixed(2)}`)
        console.log(`🔍 COMPARISON DEBUG - Percentage Difference: ${(((totalAttendanceDeductions - 5670.8) / 5670.8) * 100).toFixed(2)}%`)
      }

      console.log(`🔍 Deduction Breakdown - User: ${user.name}, Database Deductions: ₱${totalDatabaseDeductions.toFixed(6)}, Attendance Deductions: ₱${totalAttendanceDeductions.toFixed(6)}`)
      console.log(`🔍 All Deduction Details for ${user.name}:`, deductionDetails.map(d => `${d.deductionType.name}: ₱${d.amount}`))
      console.log(`🔍 Filtered Non-Attendance Deductions for ${user.name}:`, deductionDetails.filter(d => 
        !d.deductionType.name.includes('Late') && 
        !d.deductionType.name.includes('Absent') &&
        !d.deductionType.name.includes('Early')
      ).map(d => `${d.deductionType.name}: ₱${d.amount}`))
      
      // No auto-creation of deductions; page should reflect only existing records

      // Get approved unpaid leave requests for this user in the payroll period
      const unpaidLeaveRequests = await prisma.leaveRequest.findMany({
        where: {
          users_id: user.users_id,
          status: 'APPROVED',
          isPaid: false,
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart }
        }
      })

      // Calculate unpaid leave deduction
      let totalUnpaidLeaveDays = 0
      for (const leave of unpaidLeaveRequests) {
        const leaveStart = new Date(leave.startDate) > periodStart ? new Date(leave.startDate) : periodStart
        const leaveEnd = new Date(leave.endDate) < periodEnd ? new Date(leave.endDate) : periodEnd
        
        // Count days between leaveStart and leaveEnd (inclusive)
        let currentDate = new Date(leaveStart)
        while (currentDate <= leaveEnd) {
          // Only count working days (exclude Sundays)
          if (getPhilippinesDayOfWeek(currentDate) !== 0) {
            totalUnpaidLeaveDays++
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
      
      const unpaidLeaveDeduction = totalUnpaidLeaveDays * dailySalary
      console.log(`🔍 Unpaid Leave Debug - User: ${user.name}, Unpaid Days: ${totalUnpaidLeaveDays}, Daily Salary: ₱${dailySalary.toFixed(2)}, Total Deduction: ₱${unpaidLeaveDeduction.toFixed(2)}`)

      // Get active loans for this user and calculate monthly payment
      const activeLoans = await prisma.loan.findMany({
        where: {
          users_id: user.users_id,
          status: 'ACTIVE'
        },
        select: {
          amount: true,
          monthlyPaymentPercent: true
        }
      })

      // Calculate total loan payments based on loan amount percent, scaled per payroll period
      const totalLoanPayments = activeLoans.reduce((sum, loan) => {
        const monthlyPayment = (parseFloat(loan.amount.toString()) * parseFloat(loan.monthlyPaymentPercent.toString())) / 100
        const perPayrollPayment = monthlyPayment * perPayrollFactor
        return sum + perPayrollPayment
      }, 0)

      // Use database deductions + attendance deductions + unpaid leave deductions + loan payments
      const finalTotalDeductions = totalDatabaseDeductions + totalAttendanceDeductions + unpaidLeaveDeduction + totalLoanPayments

      const netSalary = grossSalary - finalTotalDeductions

      console.log(`🔍 Payroll Summary - User: ${user.name}, Basic Salary: ₱${basicSalary.toFixed(6)}, Gross (Full Period): ₱${grossSalary.toFixed(6)}, Database Deductions: ₱${totalDatabaseDeductions.toFixed(6)}, Attendance Deductions: ₱${totalAttendanceDeductions.toFixed(6)}, Unpaid Leave Deduction: ₱${unpaidLeaveDeduction.toFixed(6)}, Loan Payments: ₱${totalLoanPayments.toFixed(6)}, Total Deductions: ₱${finalTotalDeductions.toFixed(6)}, Net: ₱${netSalary.toFixed(6)}`)

      computedEntries.push({
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        personnelType: {
          name: user.personnelType.name,
          basicSalary: basicSalary
        },
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        totalWorkHours,
        grossSalary,
        totalDeductions: finalTotalDeductions,
        netSalary,
        status: (usersIdToStatus.get(user.users_id) || 'Pending') as 'Pending' | 'Released' | 'Archived',
        attendanceRecords: userAttendanceRecords,
        deductionDetails: periodNonAttendanceDeductions.map(deduction => ({
          id: (deduction as any).deductions_id || (deduction as any).deduction_id || '',
          amount: parseFloat(deduction.amount.toString()),
          type: deduction.deductionType.name,
          description: deduction.deductionType.description,
          appliedAt: deduction.appliedAt.toISOString(),
          notes: deduction.notes
        })),
        loanPayments: totalLoanPayments,
        // Separate deduction breakdowns for frontend
        attendanceDeductions: totalAttendanceDeductions,
        databaseDeductions: totalDatabaseDeductions,
        unpaidLeaveDeduction: unpaidLeaveDeduction,
        unpaidLeaveDays: totalUnpaidLeaveDays
      })

      compTotalGross += grossSalary
      compTotalDeductions += finalTotalDeductions
      compTotalNet += netSalary
    }

    payrollEntries = computedEntries
    totalGrossSalary = compTotalGross
    totalDeductions = compTotalDeductions
    totalNetSalary = compTotalNet
    }

    // Determine generated state for the SETTINGS period (not the display period)
    const settingsEntries = await prisma.payrollEntry.findMany({
      where: { periodStart: settingsPeriodStart, periodEnd: settingsPeriodEnd },
      select: { status: true }
    })
    const hasGeneratedForSettings = settingsEntries.length > 0

    const summary: PayrollSummary = {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalEmployees: payrollEntries.length,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      workingDays,
      payrollEntries,
      hasGenerated,
      hasReleased,
      settings: {
        periodStart: settingsPeriodStart.toISOString(),
        periodEnd: settingsPeriodEnd.toISOString(),
        hasGeneratedForSettings,
        timeOutEnd: attendanceSettings?.timeOutEnd
      }
    }

    return { success: true, summary }

  } catch (error) {
    console.error('❌ Error in getPayrollSummary:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })
    return { success: false, error: `Failed to load payroll summary: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Server Action: Get Payroll Schedule
export async function getPayrollSchedule(): Promise<{
  success: boolean
  schedule?: PayrollSchedule
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Use the same logic as getPayrollSummary
    const summaryResult = await getPayrollSummary()
    
    if (!summaryResult.success) {
      return { success: false, error: summaryResult.error }
    }

    // Convert summary to schedule format
    const schedule: PayrollSchedule = {
      periodStart: summaryResult.summary!.periodStart,
      periodEnd: summaryResult.summary!.periodEnd,
      totalEmployees: summaryResult.summary!.totalEmployees,
      totalGrossSalary: summaryResult.summary!.totalGrossSalary,
      totalDeductions: summaryResult.summary!.totalDeductions,
      totalNetSalary: summaryResult.summary!.totalNetSalary,
      workingDays: summaryResult.summary!.workingDays,
      payrollEntries: summaryResult.summary!.payrollEntries
    }

    return { success: true, schedule }

  } catch (error) {
    console.error('Error in getPayrollSchedule:', error)
    return { success: false, error: 'Failed to load payroll schedule' }
  }
}

// Server Action: Generate Payroll
export async function generatePayroll(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Get current attendance settings to determine the period for new payroll generation
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    if (!attendanceSettings || !attendanceSettings.periodStart || !attendanceSettings.periodEnd) {
      return { success: false, error: 'Attendance settings not found or period not set' }
    }

    const periodStart = attendanceSettings.periodStart
    const periodEnd = attendanceSettings.periodEnd

    // Clear any existing payroll entries for the current settings period to force fresh generation
    await prisma.payrollEntry.deleteMany({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd
      }
    })

    // Update attendance settings timestamp to signal fresh generation
    await prisma.attendanceSettings.updateMany({
      data: { updatedAt: new Date() }
    })

    // Generate fresh payroll data for the current period (this will reset the summary)
    const freshSummaryResult = await getPayrollSummary()
    
    if (!freshSummaryResult.success) {
      return { success: false, error: freshSummaryResult.error }
    }

    const summary = freshSummaryResult.summary!

    // Create/update payroll entries in database without relying on a composite unique constraint
    for (const entry of summary.payrollEntries) {
      const periodStartDate = new Date(summary.periodStart)
      const periodEndDate = new Date(summary.periodEnd)

      const existing = await prisma.payrollEntry.findFirst({
        where: {
          users_id: entry.users_id,
          periodStart: periodStartDate,
          periodEnd: periodEndDate
        }
      })

      if (existing) {
        await prisma.payrollEntry.update({
          where: { payroll_entries_id: existing.payroll_entries_id },
          data: {
            basicSalary: entry.grossSalary,
            overtime: 0,
            deductions: entry.totalDeductions,
            netPay: entry.netSalary,
            status: 'PENDING'
          }
        })
      } else {
        await prisma.payrollEntry.create({
          data: {
            users_id: entry.users_id,
            periodStart: periodStartDate,
            periodEnd: periodEndDate,
            basicSalary: entry.grossSalary,
            overtime: 0,
            deductions: entry.totalDeductions,
            netPay: entry.netSalary,
            status: 'PENDING'
          }
        })
      }
    }

    // Auto-archive any previously RELEASED payroll entries that belong to older periods
    // This ensures that once a new period is generated, older released payrolls move to the archive
    const newPeriodStartDate = new Date(summary.periodStart)
    
    // Debug: Check what released entries exist before archiving
    const releasedEntriesToCheck = await prisma.payrollEntry.findMany({
      where: {
        status: 'RELEASED',
        archivedAt: null,
      },
      select: {
        payroll_entries_id: true,
        periodStart: true,
        periodEnd: true,
        users_id: true
      }
    })
    console.log(`🔍 Found ${releasedEntriesToCheck.length} RELEASED entries to check for archiving:`)
    releasedEntriesToCheck.forEach(entry => {
      const shouldArchive = new Date(entry.periodEnd) < newPeriodStartDate
      console.log(`  - Entry ${entry.payroll_entries_id}: ${entry.periodStart.toISOString()} to ${entry.periodEnd.toISOString()} (should archive: ${shouldArchive})`)
    })
    
    const autoArchiveResult = await prisma.payrollEntry.updateMany({
      where: {
        status: 'RELEASED',
        archivedAt: null,
        periodEnd: { lt: newPeriodStartDate }, // Archive entries that end before the new period starts
      },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    })
    console.log(`🗄️ Auto-archived previous released payrolls: ${autoArchiveResult.count} entries with periodEnd < ${newPeriodStartDate.toISOString()}`)

    // After generating, set the summary's display period to the newly generated one by updating Attendance Settings
    await prisma.attendanceSettings.upsert({
      where: { attendance_settings_id: (await prisma.attendanceSettings.findFirst({ select: { attendance_settings_id: true } }))?.attendance_settings_id || '' },
      update: {
        periodStart: new Date(summary.periodStart),
        periodEnd: new Date(summary.periodEnd),
      },
      create: {
        periodStart: new Date(summary.periodStart),
        periodEnd: new Date(summary.periodEnd),
      },
    })

    revalidatePath('/admin/payroll')
    
    return { 
      success: true, 
      message: `Payroll generated successfully for ${summary.totalEmployees} employees` 
    }

  } catch (error) {
    console.error('Error in generatePayroll:', error)
    return { success: false, error: 'Failed to generate payroll' }
  }
}

// Server Action: Release Payroll
export async function releasePayroll(entryIds: string[]): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Get payroll entries to find period info and user IDs
    const entries = await prisma.payrollEntry.findMany({
      where: {
        payroll_entries_id: {
          in: entryIds
        }
      },
      select: {
        users_id: true,
        periodStart: true,
        periodEnd: true
      }
    })

    // Update payroll entries status to RELEASED
    await prisma.payrollEntry.updateMany({
      where: {
        payroll_entries_id: {
          in: entryIds
        }
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date()
      }
    })

    // Send notification to all personnel
    if (entries.length > 0) {
      const { createNotification } = await import('@/lib/notifications')
      const periodStart = new Date(entries[0].periodStart).toLocaleDateString()
      const periodEnd = new Date(entries[0].periodEnd).toLocaleDateString()
      
      for (const entry of entries) {
        try {
          await createNotification({
            title: 'Payroll Released',
            message: `Your payroll for ${periodStart} - ${periodEnd} has been released. View your payslip now.`,
            type: 'success',
            userId: entry.users_id
          })
        } catch (notifError) {
          console.error(`Failed to create notification for user ${entry.users_id}:`, notifError)
        }
      }
    }

    revalidatePath('/admin/payroll')
    
    return { 
      success: true, 
      message: `Payroll released successfully for ${entryIds.length} employees` 
    }

  } catch (error) {
    console.error('Error in releasePayroll:', error)
    return { success: false, error: 'Failed to release payroll' }
  }
}

// Server Action: Get Payroll Entries
export async function getPayrollEntries(): Promise<{
  success: boolean
  entries?: any[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const entries = await prisma.payrollEntry.findMany({
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Serialize Decimal fields
    const serializedEntries = entries.map(entry => ({
      ...entry,
      basicSalary: Number(entry.basicSalary),
      deductions: Number(entry.deductions),
      netPay: Number(entry.netPay),
      user: {
        ...entry.user,
        personnelType: entry.user.personnelType ? {
          ...entry.user.personnelType,
          basicSalary: Number(entry.user.personnelType.basicSalary)
        } : undefined
      }
    }))

    return { success: true, entries: serializedEntries }

  } catch (error) {
    console.error('Error in getPayrollEntries:', error)
    return { success: false, error: 'Failed to load payroll entries' }
  }
}

// Server Action: Release Payroll (Admin Trigger)
export async function releasePayrollWithAudit(nextPeriodStart?: string, nextPeriodEnd?: string): Promise<{
  success: boolean
  releasedCount?: number
  message?: string
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const adminId = session.user.id

    // Determine period dates aligned with attendance settings if available
    let startDate: Date
    let endDate: Date
    const attendanceSettingsForRelease = await prisma.attendanceSettings.findFirst()
    if (attendanceSettingsForRelease?.periodStart && attendanceSettingsForRelease?.periodEnd) {
      startDate = new Date(attendanceSettingsForRelease.periodStart)
      endDate = new Date(attendanceSettingsForRelease.periodEnd)
    } else {
      const now = getNowInPhilippines() // Use Philippines timezone
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      startDate = new Date(currentYear, currentMonth, 1)
      endDate = new Date(currentYear, currentMonth + 1, 0)
    }

    // Normalize period to day boundaries using Philippines timezone
    const startOfDayPH = new Date(startDate); startOfDayPH.setHours(0,0,0,0)
    const endOfDayPH = new Date(endDate); endOfDayPH.setHours(23,59,59,999)

    // Get entries that will be released (before transaction) for notification sending
    const entriesToRelease = await prisma.payrollEntry.findMany({
      where: {
        periodStart: { gte: startOfDayPH },
        periodEnd: { lte: endOfDayPH },
        status: { in: ['PENDING'] }
      },
      select: {
        users_id: true,
        periodStart: true,
        periodEnd: true
      }
    })

    // Atomically: release current period entries and persist next period in AttendanceSettings
    const updateResult = await prisma.$transaction(async (tx) => {
      // Release all pending entries for current period
      const res = await tx.payrollEntry.updateMany({
        where: {
          periodStart: { gte: startOfDayPH },
          periodEnd: { lte: endOfDayPH },
          status: { in: ['PENDING'] }
        },
        data: {
          status: 'RELEASED',
          releasedAt: new Date()
        }
      })

      // Persist NEXT period into attendance settings (flexible dates provided by admin)
      if (nextPeriodStart && nextPeriodEnd) {
        // Convert PH-local dates to UTC using helper to avoid off-by-one
        const npStart = parsePhilippinesLocalDate(nextPeriodStart, false)
        const npEnd = parsePhilippinesLocalDate(nextPeriodEnd, true)

        const existingSettings = await tx.attendanceSettings.findFirst({ select: { attendance_settings_id: true } })
        if (existingSettings) {
          await tx.attendanceSettings.update({
            where: { attendance_settings_id: existingSettings.attendance_settings_id },
            data: { periodStart: npStart, periodEnd: npEnd }
          })
        } else {
          await tx.attendanceSettings.create({
            data: { periodStart: npStart, periodEnd: npEnd }
          })
        }
      }

      return res
    })

    // Send notification to all personnel whose payroll was released
    if (entriesToRelease.length > 0) {
      const { createNotification } = await import('@/lib/notifications')
      const periodStart = new Date(entriesToRelease[0].periodStart).toLocaleDateString()
      const periodEnd = new Date(entriesToRelease[0].periodEnd).toLocaleDateString()
      
      // Send notification to each personnel
      for (const entry of entriesToRelease) {
        try {
          await createNotification({
            title: 'Payroll Released',
            message: `Your payroll for ${periodStart} - ${periodEnd} has been released. View your payslip now.`,
            type: 'success',
            userId: entry.users_id
          })
        } catch (notifError) {
          console.error(`Failed to create notification for user ${entry.users_id}:`, notifError)
        }
      }
      console.log(`✅ Sent payroll release notifications to ${entriesToRelease.length} personnel`)
      
      // Send notification to admin
      try {
        await createNotification({
          title: '🎉 Payroll Auto-Released',
          message: `Payroll for ${periodStart} - ${periodEnd} was automatically released to ${entriesToRelease.length} employees.`,
          type: 'success',
          userId: adminId
        })
        console.log(`✅ Sent admin notification for automatic payroll release`)
      } catch (notifError) {
        console.error(`Failed to create admin notification:`, notifError)
      }
    }

    // After release, archive the just-released period when the next Generate happens; for now do not reset summary here

    // Even if nothing was updated (no PENDING entries), proceed successfully
    // per UX: no hard guard on release; still persist next period and refresh UI
    // Caller can use releasedCount === 0 to show an informational toast.

    // Note: Audit logging would require adding auditLog model to schema

    revalidatePath('/admin/payroll')
    
    return { success: true, releasedCount: updateResult.count, message: `Payroll released successfully for ${updateResult.count} employees` }

  } catch (error) {
    console.error('Error in releasePayrollWithAudit:', error)
    return { success: false, error: 'Failed to release payroll' }
  }
}

// Server Action: Generate Payslips with Header Settings
export async function generatePayslips(periodStart?: string, periodEnd?: string): Promise<{
  success: boolean
  payslips?: any[]
  headerSettings?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Get header settings for payslip generation
    const headerSettings = await prisma.headerSettings.findFirst()
    
    if (!headerSettings) {
      return { success: false, error: 'Header settings not configured' }
    }

    // Determine period dates
    let startDate: Date
    let endDate: Date
    
    if (periodStart && periodEnd) {
      startDate = new Date(periodStart)
      endDate = new Date(periodEnd)
    } else {
      // Auto-determine current period
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      
      if (now.getDate() <= 15) {
        startDate = new Date(currentYear, currentMonth, 1)
        endDate = new Date(currentYear, currentMonth, 15)
      } else {
        startDate = new Date(currentYear, currentMonth, 16)
        endDate = new Date(currentYear, currentMonth + 1, 0)
      }
    }

    // Get released payroll entries
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: {
        periodStart: startDate,
        periodEnd: endDate,
        status: 'RELEASED'
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    // Calculate actual work hours and deductions for each entry
    const payslips = await Promise.all(payrollEntries.map(async (entry) => {
      // Get attendance records for this user and period to calculate actual work hours
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          users_id: entry.users_id,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      // Calculate total work hours from actual attendance
      let totalWorkHours = 0
      attendanceRecords.forEach(record => {
        if (record.timeIn && record.timeOut) {
          const timeIn = new Date(record.timeIn)
          const timeOut = new Date(record.timeOut)
          const workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
          totalWorkHours += workHours
        }
      })

      // Get loan deductions for this user
      const loans = await prisma.loan.findMany({
        where: {
          users_id: entry.users_id,
          status: 'ACTIVE'
        }
      })

      let loanDeductions = 0
      const payslipPeriodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const payslipFactor = payslipPeriodDays <= 16 ? 0.5 : 1.0
      loans.forEach(loan => {
        const monthlyPayment = Number(loan.amount) * (Number(loan.monthlyPaymentPercent) / 100)
        loanDeductions += monthlyPayment * payslipFactor
      })

      // Calculate other deductions (non-attendance, non-loan)
      const otherDeductions = await prisma.deduction.findMany({
        where: {
          users_id: entry.users_id,
          appliedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      const otherDeductionsTotal = otherDeductions.reduce((sum, deduction) => {
        return sum + Number(deduction.amount)
      }, 0)

      // Calculate attendance deductions (total deductions minus loan and other deductions)
      const attendanceDeductions = Number(entry.deductions) - loanDeductions - otherDeductionsTotal

      return {
        employeeName: entry.user.name,
        employeeEmail: entry.user.email,
        payrollPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalWorkHours: totalWorkHours,
        basicSalary: Number(entry.basicSalary),
        attendanceDeductions: Math.max(0, attendanceDeductions), // Ensure non-negative
        loanDeductions: loanDeductions,
        otherDeductions: otherDeductionsTotal,
        finalNetPay: Number(entry.netPay),
        headerSettings: {
          companyLogo: headerSettings.logoUrl,
          companyName: headerSettings.schoolName,
          companyAddress: headerSettings.schoolAddress
        }
      }
    }))

    return {
      success: true,
      payslips,
      headerSettings
    }

  } catch (error) {
    console.error('Error in generatePayslips:', error)
    return { success: false, error: 'Failed to generate payslips' }
  }
}