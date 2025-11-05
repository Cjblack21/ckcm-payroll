import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testBreakdownAPI() {
  try {
    const settings = await prisma.attendanceSettings.findFirst()
    const user = await prisma.user.findFirst({
      where: { email: 'mike.johnson@pms.com' }
    })
    
    if (!settings || !user) {
      console.log('Settings or user not found')
      return
    }
    
    const url = `http://localhost:3000/api/personnel/payroll/breakdown?periodStart=${settings.periodStart?.toISOString()}&periodEnd=${settings.periodEnd?.toISOString()}`
    
    console.log('Testing breakdown API...')
    console.log('URL:', url)
    console.log('')
    
    const response = await fetch(url, {
      headers: {
        'Cookie': `next-auth.session-token=test` // This won't work but shows the call
      }
    })
    
    console.log('Status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('\nBreakdown Response:')
      console.log('  Total Deductions:', data.totalDeductions)
      console.log('  Attendance Deductions:', data.attendanceDeductionsTotal)
      console.log('  Database Deductions:', data.databaseDeductionsTotal)
      console.log('  Attendance Records:', data.attendanceRecords?.length || 0)
      
      if (data.attendanceRecords) {
        console.log('\nAttendance Records:')
        data.attendanceRecords.forEach((record: any) => {
          console.log(`  ${record.date}: ${record.status} - Deductions: ₱${record.deductions}`)
        })
      }
    } else {
      console.log('Error:', await response.text())
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBreakdownAPI()
