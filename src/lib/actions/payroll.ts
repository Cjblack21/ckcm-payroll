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
import { getLiveAttendanceRecords } from "@/lib/attendance-live"
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
  avatar?: string | null
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
  totalAdditions: number
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
      // No period set - return empty summary (no fallback to current month)
      console.log('🔧 No payroll period set - returning empty summary')
      return {
        success: true,
        summary: {
          periodStart: '',
          periodEnd: '',
          totalEmployees: 0,
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalNetSalary: 0,
          workingDays: [],
          payrollEntries: [],
          hasGenerated: false,
          hasReleased: false,
          settings: {
            periodStart: '',
            periodEnd: '',
            hasGeneratedForSettings: false,
            timeOutEnd: attendanceSettings?.timeOutEnd || null
          }
        }
      }
    }

    // Preserve settings period separately for UI logic (Generate button state)
    const settingsPeriodStart = new Date(periodStart)
    const settingsPeriodEnd = new Date(periodEnd)

    // Decide which period to DISPLAY in the summary:
    // - Always show the settings period (what admin configured)
    // - This ensures after release, the UI shows the NEW period ready for generation
    console.log('🔧 Using settings period as configured by admin')
    // periodStart and periodEnd are already set to settings period above

    console.log('Period dates:', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    })
    const periodDays = calculatePeriodDurationInPhilippines(periodStart, periodEnd)
    // ALWAYS use semi-monthly calculation (divide by 2) regardless of period length
    const perPayrollFactor = 0.5
    
    console.log(`💰 SALARY CALCULATION - Period Days: ${periodDays}`)
    console.log(`💰 SALARY CALCULATION - Payroll Factor: ${perPayrollFactor}x (ALWAYS Semi-Monthly)`)
    console.log(`💰 SALARY CALCULATION - Salary will ALWAYS be DIVIDED BY 2`)

    // Get all active personnel users
    console.log('🔍 Payroll Summary - Fetching users')
    const users = await prisma.user.findMany({
      where: { 
        isActive: true, 
        role: 'PERSONNEL' 
      },
      select: {
        users_id: true,
        name: true,
        email: true,
        personnelType: {
          select: {
            name: true,
            type: true,
            department: true,
            basicSalary: true
          }
        }
      }
    })

    console.log('🔍 Payroll Summary - Users found:', users.length)

    // Use the period dates directly - they're already in correct Philippines timezone from parsePhilippinesLocalDate
    // periodStart is already 00:00:00 Philippines time
    // periodEnd is already 23:59:59 Philippines time
    const periodStartDay = periodStart
    const periodEndDay = periodEnd

    console.log(`📅 Original periodStart: ${periodStart.toISOString()}`)
    console.log(`📅 Original periodEnd: ${periodEnd.toISOString()}`)
    console.log(`📅 Querying attendance from ${periodStartDay.toISOString()} to ${periodEndDay.toISOString()}`)
    console.log(`📅 Period Start (Philippines date): ${toPhilippinesDateString(periodStartDay)}`)
    console.log(`📅 Period End (Philippines date): ${toPhilippinesDateString(periodEndDay)}`)

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
                type: true,
                department: true,
                basicSalary: true
              }
            }
          }
        }
      }
    })

    console.log('Attendance records found:', attendanceRecords.length)
    if (attendanceRecords.length > 0) {
      const uniqueDates = [...new Set(attendanceRecords.map(r => r.date.toISOString().split('T')[0]))].sort()
      console.log(`📅 Attendance dates retrieved: ${uniqueDates.join(', ')}`)
      console.log(`📅 First attendance date: ${uniqueDates[0]}`)
      console.log(`📅 Last attendance date: ${uniqueDates[uniqueDates.length - 1]}`)
    }

    // Load any existing payroll entries for this period to surface real statuses (Pending/Released)
    // Exclude archived entries so old archived payrolls don't affect current payroll status
    const existingPayrollEntries = await prisma.payrollEntry.findMany({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd,
        status: { not: 'ARCHIVED' } // Only consider active payroll entries (Pending/Released)
      },
      select: {
        users_id: true,
        status: true
      }
    })
    const usersIdToStatus = new Map<string, 'Pending' | 'Released'>()
    existingPayrollEntries.forEach(e => {
      const mapped = e.status === 'RELEASED' ? 'Released' : 'Pending'
      usersIdToStatus.set(e.users_id, mapped)
    })
    const hasGenerated = existingPayrollEntries.length > 0
    const hasReleased = existingPayrollEntries.some(e => e.status === 'RELEASED')

    // Use STANDARD 22 working days for consistent daily rate calculation
    // This matches the Personnel Types page which uses 22 working days as the standard
    const currentMonth = periodStart.getMonth()
    const currentYear = periodStart.getFullYear()
    const workingDaysInMonth = 22 // Standard working days (Mon-Fri average per month)
    
    // For payroll period tracking
    const workingDaysInPeriod = calculateWorkingDaysInPhilippines(periodStart, periodEnd)
    
    console.log('🔍 WORKING DAYS DEBUG - Month:', `${currentYear}-${currentMonth + 1}`)
    console.log('🔍 WORKING DAYS DEBUG - Working Days in MONTH:', workingDaysInMonth, '(used for daily rate)')
    console.log('🔍 WORKING DAYS DEBUG - Working Days in PERIOD:', workingDaysInPeriod, '(for tracking only)')
    
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
            personnelType: { select: { name: true, type: true, department: true, basicSalary: true } }
          }
        }
      }
    })

    if (storedEntriesForPeriod.length > 0) {
      // Freeze to stored amounts, but reconstruct supporting breakdown (work hours, attendance, deductions, loans)
      const attendanceSettings = await prisma.attendanceSettings.findFirst()


      const periodDays = calculatePeriodDurationInPhilippines(periodStart, periodEnd)
      // ALWAYS use semi-monthly calculation (divide by 2) regardless of period length
      const perPayrollFactor = 0.5

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
            // Use exact timeInEnd to match attendance system (removed +1 minute tolerance)
            expected.setHours(h, m, 0, 0)
            // Use monthly salary divided by monthly working days for consistent daily rate
            const monthlyBasic = se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)
            const perSec = monthlyBasic / workingDaysInMonth / 8 / 60 / 60
            const seconds = Math.max(0, (ti.getTime() - expected.getTime()) / 1000)
            const daily = monthlyBasic / workingDaysInMonth
            recordDeduction = Math.min(seconds * perSec, daily * 0.5)
          } else if (r.status === 'ABSENT') {
            // Use monthly salary divided by monthly working days for consistent daily rate
            const monthlyBasic = se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)
            const daily = monthlyBasic / workingDaysInMonth
            recordDeduction = daily
            console.log(`💰 ABSENCE DEDUCTION - User: ${se.user?.name}`)
            console.log(`💰 Monthly Basic: ₱${monthlyBasic.toFixed(2)}`)
            console.log(`💰 Working Days in Month: ${workingDaysInMonth}, Daily Rate: ₱${daily.toFixed(2)}`)
            console.log(`💰 Absence Deduction: ₱${recordDeduction.toFixed(2)}`)
          } else if (r.status === 'PARTIAL') {
            // Use monthly salary divided by monthly working days for consistent daily rate
            const monthlyBasic = se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)
            const daily = monthlyBasic / workingDaysInMonth
            const hourly = daily / 8
            // Hours short from expected 8
            const hoursShort = Math.max(0, 8 - hours)
            recordDeduction = hoursShort * hourly
          }

          return {
            date: toPhilippinesDateString(r.date),
            timeIn: r.timeIn?.toISOString() || null,
            timeOut: r.timeOut?.toISOString() || null,
            status: r.status,
            workHours: hours,
            earnings: 0,
            deductions: recordDeduction,
          }
        }) as any

        // Non-attendance deductions for period
        // For mandatory deductions, don't filter by date - they apply to every period
        const periodDeductions = await prisma.deduction.findMany({
          where: {
            users_id: se.users_id,
            archivedAt: null, // Exclude archived deductions
            OR: [
              // Mandatory deductions - always include
              {
                deductionType: {
                  isMandatory: true
                }
              },
              // Other deductions - only within period
              {
                deductionType: {
                  isMandatory: false
                },
                appliedAt: { gte: periodStart, lte: periodEnd }
              }
            ]
          },
          include: { deductionType: { select: { name: true, description: true, isMandatory: true } } },
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
            include: { deductionType: { select: { name: true, description: true, isMandatory: true } } },
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

        // Sum attendance deductions from the attendance records (already calculated above)
        let attendanceDeductions = 0
        for (const record of attendanceRecords) {
          if (record.deductions > 0) {
            attendanceDeductions += record.deductions
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
          grossSalary: (se.user?.personnelType?.basicSalary ? Number(se.user.personnelType.basicSalary) : Number(se.basicSalary)) * perPayrollFactor,
          totalDeductions: Number(se.deductions),
          netSalary: Number(se.netPay),
          status: se.status === 'RELEASED' ? 'Released' : 'Pending',
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

      const monthlyBasicSalary = parseFloat(user.personnelType.basicSalary.toString())
      // For semi-monthly payroll, use half of monthly salary for deduction calculations
      const basicSalary = monthlyBasicSalary * 0.5
      // Use actual working days in the period for absence deduction calculation
      const totalWorkingDaysInPeriod = workingDaysInPeriod
      // FIXED: Divide semi-monthly salary by working days in period (not monthly salary by days in month)
      const dailySalary = basicSalary / workingDaysInPeriod
      
      console.log(`🔍 Payroll Debug - User: ${user.name}, Monthly Basic Salary: ₱${monthlyBasicSalary.toFixed(2)}, Period Basic Salary: ₱${basicSalary.toFixed(2)}, Daily Salary: ₱${dailySalary.toFixed(2)}, Working Days: ${totalWorkingDaysInPeriod}`)
      
      let totalDays = 0
      let presentDays = 0
      let absentDays = 0
      let lateDays = 0
      let grossSalary = 0 // Will be calculated as basic salary for the period
      let totalUserDeductions = 0 // Will be replaced by database deductions
      let totalWorkHours = 0
      const userAttendanceRecords: AttendanceRecord[] = []

      // Use live attendance records with cutoff-aware status and deductions
      const liveAttendanceRecords = await getLiveAttendanceRecords(
        user.users_id,
        periodStartDay,
        periodEndDay,
        basicSalary
      )
      
      console.log(`🔍 Payroll Debug - User: ${user.name}, Live Attendance Records: ${liveAttendanceRecords.length}`)
      
      // Process each working day using Philippines timezone
      const checkDate = new Date(periodStart)
      const todayForUser = getNowInPhilippines() // Use Philippines timezone for each user
      // Set today to end of day for comparison
      const todayEndOfDay = new Date(todayForUser)
      todayEndOfDay.setHours(23, 59, 59, 999)
      while (checkDate <= periodEnd && checkDate <= todayEndOfDay) {
        const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' })
        const dayOfWeek = getPhilippinesDayOfWeek(checkDate)
        
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Saturdays (6) and Sundays (0) using Philippines timezone
          totalDays++
          const dateKey = toPhilippinesDateString(checkDate)
          const attendanceKey = `${user.users_id}-${dateKey}`
          const attendance = attendanceMap.get(attendanceKey)
          
          // Find corresponding live attendance record
          const liveRecord = liveAttendanceRecords.find(r => 
            toPhilippinesDateString(r.date) === dateKey
          )
          
          console.log(`🔍 Payroll Day Processing - User: ${user.name}, Date: ${dateKey}, Day: ${dayName}, Has Attendance Record: ${!!attendance}, Has Live Record: ${!!liveRecord}`)

          // Declare variables at higher scope
          let workHours = 0
          let earnings = 0
          let deductions = 0
          
          if (attendance && liveRecord) {
              // Use live attendance data for consistency with attendance system
              const calculatedStatus = liveRecord.status
              workHours = liveRecord.workHours
              earnings = liveRecord.earnings
              deductions = liveRecord.deductions
              
              // Update day counters based on status
              if (calculatedStatus === 'PRESENT' || calculatedStatus === 'LATE' || calculatedStatus === 'PARTIAL') {
                presentDays++
              }
              if (calculatedStatus === 'LATE') {
                lateDays++
              }
              if (calculatedStatus === 'ABSENT') {
                absentDays++
              }
              
              userAttendanceRecords.push({
                date: dateKey,
                timeIn: liveRecord.timeIn?.toISOString() || null,
                timeOut: liveRecord.timeOut?.toISOString() || null,
                status: calculatedStatus,
                workHours,
                earnings,
                deductions
              })

            // Accumulate attendance deductions from this record
            totalUserDeductions += deductions
            
            // Don't accumulate gross salary here - will be set to basic salary for period
            totalWorkHours += workHours
            
              
              console.log(`🔍 Daily Calculation - User: ${user.name}, Date: ${dateKey}, Status: ${calculatedStatus}, Work Hours: ${workHours.toFixed(2)}, Deductions: ₱${deductions.toFixed(2)} (from live attendance)`)
          } else {
            // No attendance record - use live record if available (for auto-marked absent)
            console.log(`🔍 Payroll No Record Processing - User: ${user.name}, Date: ${dateKey}, Day: ${dayName}`)
            
            if (liveRecord) {
              // Use live attendance data for days without database record
              const statusForNoRecord = liveRecord.status
              const deductionsForNoRecord = liveRecord.deductions
              
              if (statusForNoRecord === 'ABSENT') {
                absentDays++
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
              
              console.log(`🔍 No Record Day (from live) - User: ${user.name}, Date: ${dateKey}, Status: ${statusForNoRecord}, Deductions: ₱${deductionsForNoRecord.toFixed(2)}`)
            } else {
              // No live record either - this shouldn't happen but handle gracefully
              console.log(`🔍 Payroll SKIPPING - No attendance or live record - User: ${user.name}, Date: ${dateKey}`)
            }
          }
        }
        
        checkDate.setDate(checkDate.getDate() + 1)
      }
      
      console.log(`🔍 Payroll Summary - User: ${user.name}, Total Attendance Deductions: ₱${totalUserDeductions.toFixed(2)} (from live attendance)`)
      // Get comprehensive deduction details for this user
      // For mandatory deductions (PhilHealth, SSS, Pag-IBIG), don't filter by date - they apply to every period
      // For other deductions, only include those within the current period
      console.log(`🔍🔍🔍 FETCHING DEDUCTIONS for ${user.name} (${user.users_id})`)
      console.log(`🔍 Period: ${periodStartDay.toISOString()} to ${periodEndDay.toISOString()}`)
      
      const deductionDetails = await prisma.deduction.findMany({
        where: {
          users_id: user.users_id,
          archivedAt: null, // Exclude archived deductions
          // Include ALL active deductions (both mandatory and non-mandatory)
          // Non-mandatory deductions will be archived after payroll release
        },
        include: {
          deductionType: {
            select: {
              name: true,
              description: true,
              isMandatory: true
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      })
      
      console.log(`🔍🔍🔍 FOUND ${deductionDetails.length} DEDUCTIONS for ${user.name}:`)
      deductionDetails.forEach(d => {
        console.log(`  - ${d.deductionType.name}: ₱${d.amount} (Mandatory: ${d.deductionType.isMandatory}, Applied: ${d.appliedAt.toISOString()})`)
      })
      
      // Get all active mandatory deduction types
      const activeMandatoryTypes = await prisma.deductionType.findMany({
        where: {
          isMandatory: true,
          isActive: true
        }
      })
      
      console.log(`🔍 Found ${activeMandatoryTypes.length} active mandatory deduction types`)
      
      // For each active mandatory type, ensure it's in deductionDetails
      for (const mandatoryType of activeMandatoryTypes) {
        const exists = deductionDetails.find(d => d.deduction_types_id === mandatoryType.deduction_types_id)
        if (!exists) {
          // Add it automatically
          console.log(`  ✅ AUTO-ADDING ${mandatoryType.name} (₱${mandatoryType.amount}) to ${user.name}`)
          deductionDetails.push({
            deductions_id: 'auto-' + mandatoryType.deduction_types_id,
            users_id: user.users_id,
            deduction_types_id: mandatoryType.deduction_types_id,
            amount: mandatoryType.amount,
            appliedAt: new Date(),
            notes: 'Auto-applied mandatory deduction',
            createdAt: new Date(),
            updatedAt: new Date(),
            deductionType: {
              name: mandatoryType.name,
              description: mandatoryType.description,
              isMandatory: true
            }
          } as any)
        }
      }

      // FORCE: Always fetch ALL overload pays and sum by user
      const allOverloadPays = await prisma.overloadPay.findMany({
        where: { archivedAt: null },
        include: { user: { select: { name: true } } }
      })
      
      const userOverloadPays = allOverloadPays.filter(op => op.users_id === user.users_id)
      const totalOverloadPay = userOverloadPays.reduce((sum, op) => sum + Number(op.amount), 0)
      
      console.log(`🔴 ${user.name} (${user.users_id}): Found ${userOverloadPays.length} overload records = ₱${totalOverloadPay}`)

      // Set gross salary to semi-monthly + overload pay (overload is additional salary)
      grossSalary = basicSalary + totalOverloadPay // basicSalary is already the semi-monthly amount
      
      console.log(`💰 GROSS SALARY CALCULATION - User: ${user.name}`)
      console.log(`💰 Monthly Basic Salary: ₱${monthlyBasicSalary.toFixed(2)}`)
      console.log(`💰 Semi-Monthly Calculation: ALWAYS ÷ 2`)
      console.log(`💰 Overload Pay: ₱${totalOverloadPay.toFixed(2)}`)
      console.log(`💰 GROSS SALARY FOR THIS PERIOD: ₱${grossSalary.toFixed(2)} = ₱${basicSalary.toFixed(2)} + ₱${totalOverloadPay.toFixed(2)}`)
      
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
          where: { users_id: user.users_id, archivedAt: null },
          include: { deductionType: { select: { name: true, description: true, isMandatory: true } } },
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

      // Sum up ONLY the daily deductions from attendance records (calculated above)
      let totalAttendanceDeductions = 0
      for (const record of userAttendanceRecords) {
        if (record.deductions > 0) {
          totalAttendanceDeductions += record.deductions
        }
      }
      
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - User: ${user.name}`)
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - Attendance Records: ${userAttendanceRecords.length}`)
      console.log(`🔍 PAYROLL ATTENDANCE DEBUG - Total Attendance Deductions (from daily records): ₱${totalAttendanceDeductions.toFixed(2)}`)
      
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


      // Get active loans for this user and calculate monthly payment
      const activeLoans = await prisma.loan.findMany({
        where: {
          users_id: user.users_id,
          status: 'ACTIVE'
        },
        select: {
          loans_id: true,
          amount: true,
          balance: true,
          monthlyPaymentPercent: true,
          purpose: true
        }
      })

      // Calculate total loan payments based on loan amount percent, scaled per payroll period
      const totalLoanPayments = activeLoans.reduce((sum, loan) => {
        const monthlyPayment = (parseFloat(loan.amount.toString()) * parseFloat(loan.monthlyPaymentPercent.toString())) / 100
        const perPayrollPayment = monthlyPayment * perPayrollFactor
        return sum + perPayrollPayment
      }, 0)

      // Map loan details for breakdown
      const loanDetails = activeLoans.map(loan => {
        const monthlyPayment = (parseFloat(loan.amount.toString()) * parseFloat(loan.monthlyPaymentPercent.toString())) / 100
        const perPayrollPayment = monthlyPayment * perPayrollFactor
        return {
          type: loan.purpose || 'Loan', // Use purpose as type to identify deductions
          amount: perPayrollPayment,
          remainingBalance: parseFloat(loan.balance.toString()),
          loans_id: loan.loans_id,
          purpose: loan.purpose,
          payment: perPayrollPayment,
          balance: parseFloat(loan.balance.toString())
        }
      })

      // Use database deductions + attendance deductions + loan payments
      const finalTotalDeductions = totalDatabaseDeductions + totalAttendanceDeductions + totalLoanPayments

      // Net salary = gross (which already includes overload pay) - deductions
      const netSalary = grossSalary - finalTotalDeductions

      console.log(`🔍 Payroll Summary - User: ${user.name}, Basic Salary: ₱${basicSalary.toFixed(6)}, Overload Pay: ₱${totalOverloadPay.toFixed(6)}, Gross (Full Period): ₱${grossSalary.toFixed(6)}, Database Deductions: ₱${totalDatabaseDeductions.toFixed(6)}, Attendance Deductions: ₱${totalAttendanceDeductions.toFixed(6)}, Loan Payments: ₱${totalLoanPayments.toFixed(6)}, Total Deductions: ₱${finalTotalDeductions.toFixed(6)}, Net: ₱${netSalary.toFixed(6)}`)
      console.log(`📋 Deduction Details for ${user.name}:`, periodNonAttendanceDeductions.map(d => `${d.deductionType.name}: ₱${d.amount} (Mandatory: ${d.deductionType.isMandatory ?? 'N/A'})`))

      // Log final values before pushing to entries
      console.log(`✅ PUSHING ENTRY for ${user.name}:`)
      console.log(`   - grossSalary: ₱${grossSalary.toFixed(2)}`)
      console.log(`   - totalAdditions (overload): ₱${totalOverloadPay.toFixed(2)}`)
      console.log(`   - totalDeductions: ₱${finalTotalDeductions.toFixed(2)}`)
      console.log(`   - netSalary: ₱${netSalary.toFixed(2)}`)

      computedEntries.push({
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        personnelType: {
          name: user.personnelType.name,
          type: user.personnelType.type,
          department: user.personnelType.department,
          basicSalary: monthlyBasicSalary // Store monthly salary in personnel type for reference
        },
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        totalWorkHours,
        grossSalary,
        totalDeductions: finalTotalDeductions,
        totalAdditions: totalOverloadPay,
        netSalary,
        status: (usersIdToStatus.get(user.users_id) || 'Pending') as 'Pending' | 'Released',
        attendanceRecords: userAttendanceRecords,
        deductionDetails: (() => {
          const mapped = periodNonAttendanceDeductions.map(deduction => ({
            id: (deduction as any).deductions_id || (deduction as any).deduction_id || '',
            amount: parseFloat(deduction.amount.toString()),
            type: deduction.deductionType.name,
            description: deduction.deductionType.description,
            appliedAt: deduction.appliedAt.toISOString(),
            notes: deduction.notes,
            isMandatory: deduction.deductionType.isMandatory
          }))
          console.log(`🎯🎯🎯 FINAL deductionDetails for ${user.name}:`, mapped.map(d => `${d.type}: ₱${d.amount} (Mandatory: ${d.isMandatory})`))
          return mapped
        })(),
        loanPayments: totalLoanPayments,
        loanDetails: loanDetails,
        overloadPayDetails: userOverloadPays.map(op => ({
          type: op.type || 'OVERTIME',
          amount: Number(op.amount)
        })),
        // Separate deduction breakdowns for frontend
        attendanceDeductions: totalAttendanceDeductions,
        databaseDeductions: totalDatabaseDeductions,
        unpaidLeaveDeduction: 0,
        unpaidLeaveDays: 0
      })

      compTotalGross += grossSalary
      compTotalDeductions += finalTotalDeductions
      compTotalNet += netSalary
      
      // Note: Deductions will be archived when payroll is RELEASED, not during generation
      // This allows viewing the breakdown before release
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

    // Don't delete anything - just stack new payroll entries on top of existing ones
    // This allows unlimited payroll generations without period restrictions

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

    // Always create NEW payroll entries - no period restriction
    // This allows multiple payrolls for the same person in the same period
    for (const entry of summary.payrollEntries) {
      const periodStartDate = new Date(summary.periodStart)
      const periodEndDate = new Date(summary.periodEnd)

      // Always create a new entry - stack them all!
      await prisma.payrollEntry.create({
        data: {
          users_id: entry.users_id,
          periodStart: periodStartDate,
          periodEnd: periodEndDate,
          basicSalary: entry.grossSalary,
          overtime: 0,
          deductions: entry.totalDeductions,
          netPay: entry.netSalary,
          status: 'PENDING',
          createdAt: new Date() // Track when each payroll was generated
        }
      })
    }

    // Auto-archive all RELEASED payroll entries when generating new payroll
    // This ensures personnel only see the latest released payroll
    const archivedCount = await prisma.payrollEntry.updateMany({
      where: {
        status: 'RELEASED'
      },
      data: {
        status: 'ARCHIVED'
      }
    })
    console.log(`📦 Auto-archived ${archivedCount.count} released payroll entries`)

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

    // Get full payroll summary to capture breakdown snapshot
    const summaryResult = await getPayrollSummary()
    
    // For each entry, capture the breakdown snapshot before releasing
    for (const entry of entries) {
      // Find the matching entry in summary
      const summaryEntry = summaryResult.summary?.payrollEntries.find(
        e => e.users_id === entry.users_id
      )
      
      if (summaryEntry) {
        // Create snapshot of ALL breakdown information including detailed breakdowns
        const breakdownSnapshot = {
          monthlyBasicSalary: summaryEntry.personnelType?.basicSalary,
          periodSalary: summaryEntry.grossSalary,
          totalDeductions: summaryEntry.totalDeductions,
          totalAdditions: summaryEntry.totalAdditions || 0, // Overload pay total
          netPay: summaryEntry.netSalary,
          totalWorkHours: summaryEntry.totalWorkHours,
          attendanceDeductions: summaryEntry.attendanceDeductions,
          databaseDeductions: summaryEntry.databaseDeductions,
          loanPayments: summaryEntry.loanPayments,
          attendanceRecords: summaryEntry.attendanceRecords,
          deductionDetails: summaryEntry.deductionDetails,
          loanDetails: summaryEntry.loanDetails || [], // Individual loan breakdown
          overloadPayDetails: summaryEntry.overloadPayDetails || [], // Individual additional pay breakdown
          personnelType: summaryEntry.personnelType?.name
        }
        
        // Find the payroll_entries_id for this user
        const payrollEntry = await prisma.payrollEntry.findFirst({
          where: {
            users_id: entry.users_id,
            payroll_entries_id: { in: entryIds }
          }
        })
        
        if (payrollEntry) {
          // Update this specific entry with snapshot and RELEASED status
          await prisma.payrollEntry.update({
            where: {
              payroll_entries_id: payrollEntry.payroll_entries_id
            },
            data: {
              status: 'RELEASED',
              releasedAt: new Date(),
              breakdownSnapshot: JSON.stringify(breakdownSnapshot)
            }
          })
        }
      }
    }
    
    // Fallback: update any remaining entries without snapshot
    await prisma.payrollEntry.updateMany({
      where: {
        payroll_entries_id: {
          in: entryIds
        },
        breakdownSnapshot: null
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
      // FIRST: Auto-archive all previous RELEASED payrolls (before releasing new ones)
      const archivedResult = await tx.payrollEntry.updateMany({
        where: {
          status: 'RELEASED',
          // Archive payrolls from periods before the current one
          periodEnd: { lt: startOfDayPH }
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date()
        }
      })
      
      if (archivedResult.count > 0) {
        console.log(`📦 Auto-archived ${archivedResult.count} previous RELEASED payroll entries`)
      }

      // THEN: Release all pending entries for current period
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

      // Update loan balances for all users with active loans
      const activeLoans = await tx.loan.findMany({
        where: {
          status: 'ACTIVE',
          archivedAt: null
        }
      })

      // Calculate period factor (biweekly vs monthly)
      const periodDays = Math.floor((endOfDayPH.getTime() - startOfDayPH.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const payrollFactor = periodDays <= 16 ? 0.5 : 1.0

      // Update each active loan
      for (const loan of activeLoans) {
        const loanAmount = Number(loan.amount)
        const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
        const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
        const paymentAmount = monthlyPayment * payrollFactor

        // Calculate new balance
        const currentBalance = Number(loan.balance)
        const newBalance = Math.max(0, currentBalance - paymentAmount)

        // Check if loan is fully paid
        const isFullyPaid = newBalance <= 0

        // Update loan - auto-archive when completed
        await tx.loan.update({
          where: { loans_id: loan.loans_id },
          data: {
            balance: newBalance,
            status: isFullyPaid ? 'COMPLETED' : 'ACTIVE',
            archivedAt: isFullyPaid ? new Date() : null
          }
        })

        if (isFullyPaid) {
          console.log(`🎉 Loan ${loan.loans_id} COMPLETED and AUTO-ARCHIVED: ₱${currentBalance.toFixed(2)} → ₱0.00 (final payment: ₱${paymentAmount.toFixed(2)})`)
        } else {
          console.log(`✅ Updated loan ${loan.loans_id}: ₱${currentBalance.toFixed(2)} → ₱${newBalance.toFixed(2)} (paid: ₱${paymentAmount.toFixed(2)})`)
        }
      }

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

    // Archive non-mandatory deductions after payroll is released
    // This moves them to archived section so they don't appear in future payrolls
    console.log('📦 Archiving non-mandatory deductions from released payroll...')
    
    for (const entry of entriesToRelease) {
      // Get all non-mandatory deductions for this user in this period
      const userDeductions = await prisma.deduction.findMany({
        where: {
          users_id: entry.users_id,
          archivedAt: null,
          OR: [
            {
              deductionType: {
                isMandatory: false
              },
              appliedAt: {
                gte: startOfDayPH,
                lte: endOfDayPH
              }
            }
          ]
        },
        include: {
          deductionType: {
            select: {
              name: true,
              isMandatory: true
            }
          }
        }
      })

      const nonMandatory = userDeductions.filter(d => 
        !d.deductionType.isMandatory &&
        !d.deductionType.name.includes('Late') &&
        !d.deductionType.name.includes('Absent') &&
        !d.deductionType.name.includes('Early') &&
        !d.deductionType.name.includes('Partial') &&
        !d.deductionType.name.includes('Tardiness')
      )

      if (nonMandatory.length > 0) {
        const idsToArchive = nonMandatory
          .map(d => d.deductions_id)
          .filter(id => !id.startsWith('auto-'))

        if (idsToArchive.length > 0) {
          console.log(`📦 Archiving ${idsToArchive.length} non-mandatory deductions for user ${entry.users_id}:`)
          nonMandatory.forEach(d => {
            console.log(`   - ${d.deductionType.name}: ₱${d.amount}`)
          })
          
          // ARCHIVE the deductions by setting archivedAt timestamp
          await prisma.deduction.updateMany({
            where: {
              deductions_id: { in: idsToArchive }
            },
            data: {
              archivedAt: new Date()
            }
          })
          console.log(`📦 ✅ Archived ${idsToArchive.length} non-mandatory deductions for user ${entry.users_id}`)
        }
      }
    }

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