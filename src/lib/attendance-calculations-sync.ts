/**
 * Synchronous calculation functions for backwards compatibility
 * These use fallback calculations when attendance period is not set
 */

/**
 * Calculate per-second salary based on personnel type and current period
 */
export function calculatePerSecondSalarySync(basicSalary: number, workingDaysInPeriod?: number): number {
  const workingDays = workingDaysInPeriod || 22 // Default to 22 if no period set
  const perSecondRate = basicSalary / workingDays / 8 / 60 / 60
  
  console.log(`🔍 PER-SECOND RATE DEBUG - Basic Salary: ${basicSalary}`)
  console.log(`🔍 PER-SECOND RATE DEBUG - Working Days: ${workingDays}`)
  console.log(`🔍 PER-SECOND RATE DEBUG - Calculation: ${basicSalary} / ${workingDays} / 8 / 60 / 60 = ${perSecondRate}`)
  
  return perSecondRate
}

/**
 * Calculate daily earnings based on current period
 */
export function calculateDailyEarningsSync(basicSalary: number, workingDaysInPeriod?: number): number {
  const workingDays = workingDaysInPeriod || 22 // Default to 22 if no period set
  return basicSalary / workingDays
}

/**
 * Calculate deduction based on seconds late with period-aware calculation
 */
export function calculateLateDeductionSync(basicSalary: number, timeIn: Date, expectedTimeIn: Date, workingDaysInPeriod?: number): number {
  // Calculate seconds late
  const secondsLate = Math.max(0, (timeIn.getTime() - expectedTimeIn.getTime()) / 1000)
  
  // Calculate per-second salary rate
  const perSecondRate = calculatePerSecondSalarySync(basicSalary, workingDaysInPeriod)
  
  // Calculate total deduction: seconds late × per-second rate
  const totalDeduction = secondsLate * perSecondRate
  
  console.log(`🔍 CALCULATION DEBUG - TimeIn: ${timeIn.toISOString()}`)
  console.log(`🔍 CALCULATION DEBUG - Expected: ${expectedTimeIn.toISOString()}`)
  console.log(`🔍 CALCULATION DEBUG - Seconds Late: ${secondsLate}`)
  console.log(`🔍 CALCULATION DEBUG - Per Second Rate: ${perSecondRate}`)
  console.log(`🔍 CALCULATION DEBUG - Total Deduction: ${totalDeduction}`)
  
  // Calculate daily earnings for maximum limit
  const dailyEarnings = calculateDailyEarningsSync(basicSalary, workingDaysInPeriod)
  
  // Apply maximum deduction limit: 50% of daily earnings
  const maxDeductionAmount = dailyEarnings * 0.5
  
  return Math.min(totalDeduction, maxDeductionAmount)
}

/**
 * Calculate absence deduction with period-aware calculation
 */
export function calculateAbsenceDeductionSync(basicSalary: number, workingDaysInPeriod?: number): number {
  // Absence deduction = full daily earnings
  return calculateDailyEarningsSync(basicSalary, workingDaysInPeriod)
}

/**
 * Calculate partial attendance deduction (hours short) with period-aware calculation
 */
export function calculatePartialDeduction(basicSalary: number, actualHours: number, expectedHours: number = 8, workingDaysInPeriod?: number): number {
  const dailyEarnings = calculateDailyEarningsSync(basicSalary, workingDaysInPeriod)
  const hourlyRate = dailyEarnings / expectedHours
  const hoursShort = Math.max(0, expectedHours - actualHours)
  return hoursShort * hourlyRate
}

/**
 * Calculate early time-out deduction with period-aware calculation
 */
export function calculateEarlyTimeoutDeductionSync(basicSalary: number, timeOut: Date, timeOutStart: string, workingDaysInPeriod?: number): number {
  // Parse timeOutStart (e.g., "17:00")
  const [startHour, startMinute] = timeOutStart.split(':').map(Number)
  const expectedTimeOut = new Date(timeOut)
  expectedTimeOut.setHours(startHour, startMinute, 0, 0)
  
  // Calculate seconds early
  const secondsEarly = Math.max(0, (expectedTimeOut.getTime() - timeOut.getTime()) / 1000)
  
  // Calculate per-second salary rate
  const perSecondRate = calculatePerSecondSalarySync(basicSalary, workingDaysInPeriod)
  
  // Calculate total deduction: seconds early × per-second rate
  const totalDeduction = secondsEarly * perSecondRate
  
  // Calculate daily earnings for maximum limit
  const dailyEarnings = calculateDailyEarningsSync(basicSalary, workingDaysInPeriod)
  
  // Apply maximum deduction limit: 50% of daily earnings
  const maxDeductionAmount = dailyEarnings * 0.5
  
  return Math.min(totalDeduction, maxDeductionAmount)
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
  const dailyEarnings = calculateDailyEarningsSync(basicSalary)
  const hourlyRate = dailyEarnings / 8 // Assuming 8 hours per day
  
  // Calculate earnings based on hours worked
  return Math.max(0, hoursWorked * hourlyRate)
}
