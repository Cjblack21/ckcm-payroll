/**
 * Script to debug a specific user's attendance and deductions
 * Helps identify why absence deductions are showing
 */

import { PrismaClient } from '@prisma/client'
import { getTodayRangeInPhilippines, getNowInPhilippines } from '../src/lib/timezone'

const prisma = new PrismaClient()

async function debugUserDeductions(userEmail?: string) {
  try {
    console.log('🔍 Debugging user attendance and deductions...\n')
    
    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    if (!settings) {
      console.log('❌ No attendance settings found')
      return
    }
    
    console.log('⚙️  Attendance Settings:')
    console.log(`   Period: ${settings.periodStart?.toISOString() || 'N/A'} to ${settings.periodEnd?.toISOString() || 'N/A'}`)
    console.log(`   Time In Window: ${settings.timeInStart || 'N/A'} - ${settings.timeInEnd || 'N/A'}`)
    console.log(`   Time Out Window: ${settings.timeOutStart || 'N/A'} - ${settings.timeOutEnd || 'N/A'}`)
    console.log(`   Cutoff: ${settings.timeOutEnd || 'N/A'}`)
    console.log('')
    
    // Get current time
    const nowPH = getNowInPhilippines()
    const nowHH = nowPH.getHours().toString().padStart(2, '0')
    const nowMM = nowPH.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    
    console.log(`⏰ Current Time (PH): ${nowHHmm}`)
    console.log(`   Is Before Cutoff: ${nowHHmm <= (settings.timeOutEnd || '23:59')}`)
    console.log('')
    
    // Find user
    const user = userEmail 
      ? await prisma.user.findUnique({ where: { email: userEmail }, include: { personnelType: true } })
      : await prisma.user.findFirst({ where: { role: 'PERSONNEL' }, include: { personnelType: true } })
    
    if (!user) {
      console.log('❌ No user found')
      return
    }
    
    console.log(`👤 User: ${user.name} (${user.email})`)
    console.log(`   Basic Salary: ₱${user.personnelType?.basicSalary || 0}`)
    console.log('')
    
    // Get today's attendance
    const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        users_id: user.users_id,
        date: { gte: startOfToday, lte: endOfToday }
      }
    })
    
    console.log('📅 TODAY\'S Attendance:')
    if (todayAttendance) {
      console.log(`   Status: ${todayAttendance.status}`)
      console.log(`   Time In: ${todayAttendance.timeIn?.toISOString() || 'null'}`)
      console.log(`   Time Out: ${todayAttendance.timeOut?.toISOString() || 'null'}`)
    } else {
      console.log('   No attendance record for today')
    }
    console.log('')
    
    // Get all attendance in period
    if (settings.periodStart && settings.periodEnd) {
      const periodAttendance = await prisma.attendance.findMany({
        where: {
          users_id: user.users_id,
          date: { gte: settings.periodStart, lte: settings.periodEnd }
        },
        orderBy: { date: 'asc' }
      })
      
      console.log(`📊 PERIOD Attendance (${periodAttendance.length} records):`)
      for (const record of periodAttendance) {
        const dateStr = record.date.toISOString().split('T')[0]
        const isToday = record.date >= startOfToday && record.date <= endOfToday
        console.log(`   ${isToday ? '👉 ' : '   '}${dateStr}: ${record.status}${record.timeIn ? ` (In: ${record.timeIn.toLocaleTimeString()})` : ''}`)
      }
      console.log('')
    }
    
    // Get all deductions in period
    if (settings.periodStart && settings.periodEnd) {
      const deductions = await prisma.deduction.findMany({
        where: {
          users_id: user.users_id,
          appliedAt: { gte: settings.periodStart, lte: settings.periodEnd }
        },
        include: {
          deductionType: true
        },
        orderBy: { appliedAt: 'desc' }
      })
      
      console.log(`💸 PERIOD Deductions (${deductions.length} records):`)
      let totalAttendanceDeductions = 0
      let todayAbsenceDeductions = 0
      
      for (const deduction of deductions) {
        const dateStr = deduction.appliedAt.toISOString().split('T')[0]
        const isToday = deduction.appliedAt >= startOfToday && deduction.appliedAt <= endOfToday
        const isAttendanceRelated = ['Late Arrival', 'Early Time-Out', 'Absence Deduction', 'Absent', 'Late', 'Tardiness'].includes(deduction.deductionType.name)
        
        console.log(`   ${isToday ? '👉 ' : '   '}${dateStr}: ${deduction.deductionType.name} - ₱${deduction.amount}`)
        
        if (isAttendanceRelated) {
          totalAttendanceDeductions += Number(deduction.amount)
          if (isToday && deduction.deductionType.name === 'Absence Deduction') {
            todayAbsenceDeductions += Number(deduction.amount)
          }
        }
      }
      
      console.log('')
      console.log(`   Total Attendance Deductions: ₱${totalAttendanceDeductions.toFixed(2)}`)
      if (todayAbsenceDeductions > 0) {
        console.log(`   \u26a0\ufe0f  TODAY's Absence Deductions: ₱${todayAbsenceDeductions.toFixed(2)} (SHOULD BE 0 IF BEFORE CUTOFF!)`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging user deductions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line args or use default
const userEmail = process.argv[2]
debugUserDeductions(userEmail)
