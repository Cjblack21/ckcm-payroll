import { PrismaClient } from '@prisma/client'
import { getLiveAttendanceRecords } from '../src/lib/attendance-live'

const prisma = new PrismaClient()

async function testLiveAttendance() {
  try {
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings || !settings.periodStart || !settings.periodEnd) {
      console.log('No settings')
      return
    }
    
    const user = await prisma.user.findFirst({
      where: { email: 'mike.johnson@pms.com' },
      include: { personnelType: true }
    })
    
    if (!user) {
      console.log('User not found')
      return
    }
    
    const basicSalary = Number(user.personnelType?.basicSalary || 0)
    
    console.log(`Testing live attendance for ${user.name}`)
    console.log(`Period: ${settings.periodStart.toISOString()} to ${settings.periodEnd.toISOString()}`)
    console.log(`Basic Salary: ₱${basicSalary}\n`)
    
    const liveRecords = await getLiveAttendanceRecords(
      user.users_id,
      settings.periodStart,
      settings.periodEnd,
      basicSalary
    )
    
    console.log(`Found ${liveRecords.length} records:\n`)
    
    let totalDeductions = 0
    let totalEarnings = 0
    
    for (const record of liveRecords) {
      console.log(`Date: ${record.date.toISOString().split('T')[0]}`)
      console.log(`  Status: ${record.status}`)
      console.log(`  Work Hours: ${record.workHours.toFixed(2)}`)
      console.log(`  Earnings: ₱${record.earnings.toFixed(2)}`)
      console.log(`  Deductions: ₱${record.deductions.toFixed(2)}`)
      console.log('')
      
      totalDeductions += record.deductions
      totalEarnings += record.earnings
    }
    
    console.log(`TOTALS:`)
    console.log(`  Total Earnings: ₱${totalEarnings.toFixed(2)}`)
    console.log(`  Total Deductions: ₱${totalDeductions.toFixed(2)}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLiveAttendance()
