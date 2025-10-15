/**
 * Calculate per-second salary based on personnel type and attendance duration
 */
export async function calculatePerSecondSalary(basicSalary: number): Promise<number> {
  const { prisma } = await import('@/lib/prisma')
  
  try {
    // Get attendance settings to check duration
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (settings?.periodStart && settings?.periodEnd) {
      // Calculate working days in the period (exclude Sundays)
      const startDate = new Date(settings.periodStart)
      const endDate = new Date(settings.periodEnd)
      let workingDays = 0
      
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        if (currentDate.getDay() !== 0) { // Exclude Sundays
          workingDays++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Formula: Basic Salary / working days in duration / 8 hours / 60 minutes / 60 seconds
      return basicSalary / workingDays / 8 / 60 / 60
    }
    
    // Fallback to old calculation if no duration set
    return basicSalary / 22 / 8 / 60 / 60
  } catch (error) {
    console.error('Error calculating per-second salary:', error)
    // Fallback to old calculation
    return basicSalary / 22 / 8 / 60 / 60
  }
}

/**
 * Calculate earnings based on actual hours worked
 */
export function calculateEarnings(basicSalary: number, timeIn: Date, timeOut?: Date | null): number {
  if (!timeOut) {
    // If no time out, calculate from time in to now
    timeOut = new Date()
  }
  
  // Calculate hours worked
  const hoursWorked = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
  
  // Calculate daily earnings and hourly rate
  const dailyEarnings = calculateDailyEarnings(basicSalary)
  const hourlyRate = dailyEarnings / 8 // Assuming 8 hours per day
  
  // Calculate earnings based on hours worked
  return Math.max(0, hoursWorked * hourlyRate)
}

/**
 * Calculate deduction based on seconds late using per-second earnings
 */
export async function calculateLateDeduction(basicSalary: number, timeIn: Date, expectedTimeIn: Date): Promise<number> {
  // Calculate seconds late
  const secondsLate = Math.max(0, (timeIn.getTime() - expectedTimeIn.getTime()) / 1000)
  
  // Calculate per-second salary rate based on personnel type
  const perSecondRate = await calculatePerSecondSalary(basicSalary)
  
  // Calculate total deduction: seconds late × per-second rate
  const totalDeduction = secondsLate * perSecondRate
  
  // Calculate daily earnings for maximum limit
  const dailyEarnings = await calculateDailyEarnings(basicSalary)
  
  // Apply maximum deduction limit: 50% of daily earnings
  const maxDeductionAmount = dailyEarnings * 0.5
  
  return Math.min(totalDeduction, maxDeductionAmount)
}

/**
 * Calculate daily earnings based on personnel type basic salary and attendance duration
 */
export async function calculateDailyEarnings(basicSalary: number): Promise<number> {
  const { prisma } = await import('@/lib/prisma')
  
  try {
    // Get attendance settings to check duration
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (settings?.periodStart && settings?.periodEnd) {
      // Calculate working days in the period (exclude Sundays)
      const startDate = new Date(settings.periodStart)
      const endDate = new Date(settings.periodEnd)
      let workingDays = 0
      
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        if (currentDate.getDay() !== 0) { // Exclude Sundays
          workingDays++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Formula: Basic Salary / working days in duration
      return basicSalary / workingDays
    }
    
    // Fallback to old calculation if no duration set
    return basicSalary / 22
  } catch (error) {
    console.error('Error calculating daily earnings:', error)
    // Fallback to old calculation
    return basicSalary / 22
  }
}

/**
 * Calculate absence deduction (full daily earnings)
 */
export async function calculateAbsenceDeduction(basicSalary: number): Promise<number> {
  // Absence deduction = full daily earnings
  return await calculateDailyEarnings(basicSalary)
}

/**
 * Calculate partial attendance deduction (hours short)
 * @deprecated Use calculatePartialDeduction from attendance-calculations-sync.ts instead
 */
export async function calculatePartialDeduction(basicSalary: number, actualHours: number, expectedHours: number = 8): Promise<number> {
  const dailyEarnings = await calculateDailyEarnings(basicSalary)
  const hourlyRate = dailyEarnings / expectedHours // Daily earnings / expected hours
  const hoursShort = Math.max(0, expectedHours - actualHours)
  return hoursShort * hourlyRate
}

/**
 * Calculate early time-out deduction
 */
export async function calculateEarlyTimeoutDeduction(basicSalary: number, timeOut: Date, timeOutStart: string): Promise<number> {
  // Parse timeOutStart (e.g., "17:00")
  const [startHour, startMinute] = timeOutStart.split(':').map(Number)
  const expectedTimeOut = new Date(timeOut)
  expectedTimeOut.setHours(startHour, startMinute, 0, 0)
  
  // Calculate seconds early
  const secondsEarly = Math.max(0, (expectedTimeOut.getTime() - timeOut.getTime()) / 1000)
  
  // Calculate per-second salary rate
  const perSecondRate = await calculatePerSecondSalary(basicSalary)
  
  // Calculate total deduction: seconds early × per-second rate
  const totalDeduction = secondsEarly * perSecondRate
  
  // Calculate daily earnings for maximum limit
  const dailyEarnings = await calculateDailyEarnings(basicSalary)
  
  // Apply maximum deduction limit: 50% of daily earnings
  const maxDeductionAmount = dailyEarnings * 0.5
  
  return Math.min(totalDeduction, maxDeductionAmount)
}

/**
 * Create late deduction record in database
 */
export async function createLateDeduction(users_id: string, deductionAmount: number, lateMinutes: number, date: Date) {
  const { prisma } = await import('@/lib/prisma')
  
  try {
    // Get or create "Late Arrival" deduction type
    let lateDeductionType = await prisma.deductionType.findFirst({
      where: { name: 'Late Arrival' }
    })
    
    if (!lateDeductionType) {
      lateDeductionType = await prisma.deductionType.create({
        data: {
          name: 'Late Arrival',
          description: 'Automatic deduction for late arrival',
          amount: 0, // Amount will be calculated per incident
          isActive: true
        }
      })
    }
    
    // Create deduction entry
    await prisma.deduction.create({
      data: {
        users_id,
        deduction_types_id: lateDeductionType.deduction_types_id,
        amount: deductionAmount,
        appliedAt: date,
        notes: `Late arrival: ${lateMinutes} minutes late (₱${deductionAmount.toFixed(2)} deduction)`
      }
    })
    
    console.log(`Created late deduction: ${deductionAmount.toFixed(2)} for user ${users_id} (${lateMinutes} minutes late)`)
  } catch (error) {
    console.error('Error creating late deduction:', error)
  }
}

/**
 * Create early time-out deduction record in database
 */
export async function createEarlyTimeoutDeduction(users_id: string, deductionAmount: number, earlyMinutes: number, date: Date) {
  const { prisma } = await import('@/lib/prisma')
  
  try {
    // Get or create "Early Time-Out" deduction type
    let earlyTimeoutDeductionType = await prisma.deductionType.findFirst({
      where: { name: 'Early Time-Out' }
    })
    
    if (!earlyTimeoutDeductionType) {
      earlyTimeoutDeductionType = await prisma.deductionType.create({
        data: {
          name: 'Early Time-Out',
          description: 'Automatic deduction for early time-out',
          amount: 0, // Amount will be calculated per incident
          isActive: true
        }
      })
    }
    
    // Create deduction entry
    await prisma.deduction.create({
      data: {
        users_id,
        deduction_types_id: earlyTimeoutDeductionType.deduction_types_id,
        amount: deductionAmount,
        appliedAt: date,
        notes: `Early time-out: ${earlyMinutes} minutes early (₱${deductionAmount.toFixed(2)} deduction)`
      }
    })
    
    console.log(`Created early timeout deduction: ${deductionAmount.toFixed(2)} for user ${users_id} (${earlyMinutes} minutes early)`)
  } catch (error) {
    console.error('Error creating early timeout deduction:', error)
  }
}
