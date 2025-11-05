import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testBreakdownAPI() {
  try {
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings || !settings.periodStart || !settings.periodEnd) {
      console.log('No settings found')
      return
    }
    
    console.log('📅 Period from settings:')
    console.log(`   Start: ${settings.periodStart.toISOString()}`)
    console.log(`   End: ${settings.periodEnd.toISOString()}`)
    console.log('')
    
    const user = await prisma.user.findFirst({
      where: { email: 'bryllecooked@pms.com' },
      include: { personnelType: true }
    })
    
    if (!user) {
      console.log('User not found')
      return
    }
    
    console.log(`👤 User: ${user.name}`)
    console.log(`   Basic Salary: ₱${user.personnelType?.basicSalary || 0}`)
    console.log('')
    
    // Get attendance records in period
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        users_id: user.users_id,
        date: { gte: settings.periodStart, lte: settings.periodEnd }
      },
      orderBy: { date: 'asc' }
    })
    
    console.log(`📊 Attendance records in period (${attendanceRecords.length}):`)
    
    let totalAbsent = 0
    for (const record of attendanceRecords) {
      const dateStr = record.date.toISOString().split('T')[0]
      console.log(`   ${dateStr}: ${record.status}`)
      
      if (record.status === 'ABSENT') {
        totalAbsent++
      }
    }
    
    console.log('')
    console.log(`📉 Summary:`)
    console.log(`   Total ABSENT days: ${totalAbsent}`)
    console.log(`   Expected deduction: ₱${(totalAbsent * 909.09).toFixed(2)}`)
    console.log('')
    
    // Check if Nov 02 is included
    const nov02Start = new Date('2025-11-02T00:00:00.000Z')
    const nov02End = new Date('2025-11-02T23:59:59.999Z')
    
    const nov02Record = attendanceRecords.find(r => r.date >= nov02Start && r.date <= nov02End)
    
    if (nov02Record) {
      console.log('⚠️  Nov 02 IS included in this period!')
      console.log(`   Status: ${nov02Record.status}`)
      console.log('')
      console.log('💡 Issue: Period should start at Nov 03 00:00, not Nov 02 16:00')
      console.log('   The UTC time 2025-11-02T16:00:00.000Z includes Nov 02 data')
    } else {
      console.log('✅ Nov 02 is NOT included in this period')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBreakdownAPI()
