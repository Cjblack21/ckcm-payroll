/**
 * Philippines Timezone Utilities
 * All dates in the system should use Asia/Manila timezone
 */

import { toZonedTime, format, fromZonedTime } from 'date-fns-tz'

const PHILIPPINES_TIMEZONE = 'Asia/Manila'

/**
 * Get current date/time in Philippines timezone using proper timezone library
 */
export function getNowInPhilippines(): Date {
  const now = new Date()
  // Convert UTC to Philippines timezone using date-fns-tz
  const philippinesTime = toZonedTime(now, PHILIPPINES_TIMEZONE)
  
  console.log(`🇵🇭 TIMEZONE LIBRARY - UTC: ${now.toISOString()}`)
  console.log(`🇵🇭 TIMEZONE LIBRARY - Philippines Time: ${philippinesTime.toISOString()}`)
  console.log(`🇵🇭 TIMEZONE LIBRARY - Philippines Formatted: ${format(philippinesTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: PHILIPPINES_TIMEZONE })}`)
  
  return philippinesTime
}

/**
 * Get start of day in Philippines timezone
 */
export function getStartOfDayInPhilippines(date?: Date): Date {
  const philippinesDate = date || getNowInPhilippines()
  console.log(`🔧 START OF DAY DEBUG - Input date: ${philippinesDate.toISOString()}`)
  
  // Create start of day in UTC using Philippines date components
  const year = philippinesDate.getFullYear()
  const month = philippinesDate.getMonth()
  const day = philippinesDate.getDate()
  
  // Create start of day directly in UTC (Philippines time 00:00 = UTC+8, so subtract 8 hours to get UTC)
  // Sept 26 00:00 Philippines = Sept 25 16:00 UTC
  const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - (8 * 3600000))
  console.log(`🔧 START OF DAY DEBUG - Philippines start of day in UTC: ${startOfDayUTC.toISOString()}`)
  
  return startOfDayUTC
}

/**
 * Get end of day in Philippines timezone
 */
export function getEndOfDayInPhilippines(date?: Date): Date {
  const philippinesDate = date || getNowInPhilippines()
  console.log(`🔧 END OF DAY DEBUG - Input date: ${philippinesDate.toISOString()}`)
  
  // Create end of day in UTC using Philippines date components
  const year = philippinesDate.getFullYear()
  const month = philippinesDate.getMonth()
  const day = philippinesDate.getDate()
  
  // Create end of day directly in UTC (Philippines time 23:59:59 = UTC 15:59:59 same day)
  const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - (8 * 3600000))
  console.log(`🔧 END OF DAY DEBUG - Philippines end of day in UTC: ${endOfDayUTC.toISOString()}`)
  
  return endOfDayUTC
}

/**
 * Format date for Philippines timezone display
 */
export function formatPhilippinesDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString('en-US', { 
    timeZone: PHILIPPINES_TIMEZONE,
    ...options
  })
}

/**
 * Get date components in Philippines timezone
 */
export function getPhilippinesDateComponents(date?: Date) {
  const targetDate = date || new Date()
  const philippinesDate = new Date(targetDate.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }))
  
  return {
    year: philippinesDate.getFullYear(),
    month: philippinesDate.getMonth(),
    date: philippinesDate.getDate(),
    hours: philippinesDate.getHours(),
    minutes: philippinesDate.getMinutes(),
    seconds: philippinesDate.getSeconds()
  }
}

/**
 * Create a new Date using Philippines timezone components
 */
export function createPhilippinesDate(year: number, month: number, date: number, hours = 0, minutes = 0, seconds = 0): Date {
  return new Date(year, month, date, hours, minutes, seconds)
}

/**
 * Convert any date to Philippines timezone equivalent
 */
export function toPhilippinesTime(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }))
}

/**
 * Get today's date range in Philippines timezone using timezone library
 */
export function getTodayRangeInPhilippines() {
  const now = getNowInPhilippines()
  
  // Use timezone library to get proper Philippines date range
  const philippinesDateStr = format(now, 'yyyy-MM-dd', { timeZone: PHILIPPINES_TIMEZONE })
  const todayStart = new Date(`${philippinesDateStr}T00:00:00.000Z`)
  const todayEnd = new Date(`${philippinesDateStr}T23:59:59.999Z`)
  
  console.log(`🇵🇭 TIMEZONE RANGE - Philippines Date String: ${philippinesDateStr}`)
  console.log(`🇵🇭 TIMEZONE RANGE - Today Start: ${todayStart.toISOString()}`)
  console.log(`🇵🇭 TIMEZONE RANGE - Today End: ${todayEnd.toISOString()}`)
  
  return {
    start: todayStart,
    end: todayEnd,
    now
  }
}

/**
 * Extract time string from Philippines timezone Date object
 */
export function getPhilippinesTimeString(date: Date): string {
  // Use timezone library to extract proper Philippines time
  const timeString = format(date, 'HH:mm', { timeZone: PHILIPPINES_TIMEZONE })
  console.log(`🇵🇭 TIME EXTRACTION - Input: ${date.toISOString()}, Philippines Time: ${timeString}`)
  return timeString
}

/**
 * Parse a yyyy-mm-dd date string as Philippines local date and return the UTC Date equivalent
 * If endOfDay is true, returns 23:59:59.999 of that PH date; otherwise 00:00:00.000
 */
export function parsePhilippinesLocalDate(dateString: string, endOfDay = false): Date {
  // Use proper timezone library for accurate conversion
  const [y, m, d] = dateString.split('-').map(Number)
  if (!y || !m || !d) return new Date(dateString)
  
  // Create ISO string in Philippines timezone format
  const hours = endOfDay ? 23 : 0
  const minutes = endOfDay ? 59 : 0
  const seconds = endOfDay ? 59 : 0
  const ms = endOfDay ? 999 : 0
  
  // Format: 2025-11-06T00:00:00+08:00 (Philippines is UTC+8)
  const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}+08:00`
  
  console.log(`🇵🇭 parsePhilippinesLocalDate - Input: ${dateString}, ISO: ${isoString}`)
  
  return new Date(isoString)
}

/**
 * Convert a Date object to Philippines timezone date string (yyyy-mm-dd)
 * This is the reverse of parsePhilippinesLocalDate
 */
export function toPhilippinesDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd', { timeZone: PHILIPPINES_TIMEZONE })
}

/**
 * Get day of week in Philippines timezone (0 = Sunday, 1 = Monday, etc.)
 */
export function getPhilippinesDayOfWeek(date: Date): number {
  const philippinesDate = toZonedTime(date, PHILIPPINES_TIMEZONE)
  return philippinesDate.getDay()
}

/**
 * Calculate working days between two dates in Philippines timezone (excluding Saturdays and Sundays)
 */
export function calculateWorkingDaysInPhilippines(startDate: Date, endDate: Date): number {
  const start = toZonedTime(startDate, PHILIPPINES_TIMEZONE)
  const end = toZonedTime(endDate, PHILIPPINES_TIMEZONE)
  
  let days = 0
  const current = new Date(start)
  
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Saturdays (6) and Sundays (0)
      days++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

/**
 * Calculate period duration in days using Philippines timezone
 */
export function calculatePeriodDurationInPhilippines(startDate: Date, endDate: Date): number {
  const start = toZonedTime(startDate, PHILIPPINES_TIMEZONE)
  const end = toZonedTime(endDate, PHILIPPINES_TIMEZONE)
  
  const diffTime = end.getTime() - start.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Generate array of working days between two dates in Philippines timezone
 */
export function generateWorkingDaysInPhilippines(startDate: Date, endDate: Date): string[] {
  const start = toZonedTime(startDate, PHILIPPINES_TIMEZONE)
  const end = toZonedTime(endDate, PHILIPPINES_TIMEZONE)
  
  const workingDays: string[] = []
  const current = new Date(start)
  
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Saturdays (6) and Sundays (0)
      workingDays.push(toPhilippinesDateString(current))
    }
    current.setDate(current.getDate() + 1)
  }
  
  return workingDays
}

/**
 * Convert date input string to Philippines timezone Date object
 * Handles both yyyy-mm-dd format and ISO strings
 */
export function parseDateInputToPhilippines(dateInput: string): Date {
  if (!dateInput) return new Date()
  
  // If it's already an ISO string, convert it
  if (dateInput.includes('T') || dateInput.includes('Z')) {
    return toZonedTime(new Date(dateInput), PHILIPPINES_TIMEZONE)
  }
  
  // If it's yyyy-mm-dd format, parse as Philippines local date
  return parsePhilippinesLocalDate(dateInput)
}

/**
 * Format date for display in Philippines timezone
 */
export function formatDateForDisplay(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-GB', { 
    timeZone: PHILIPPINES_TIMEZONE,
    ...options
  })
}
