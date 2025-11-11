import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPayrollDeductions() {
  console.log('🔧 Fixing payroll attendance deductions...\n')
  
  // Get all payroll entries
  const entries = await prisma.payrollEntry.findMany({
    include: {
      user: {
        include: {
          personnelType: true
        }
      }
    }
  })
  
  console.log(`Found ${entries.length} payroll entries\n`)
  
  for (const entry of entries) {
    const startDate = new Date(entry.periodStart)
    const endDate = new Date(entry.periodEnd)
    
    // Get attendance records for this period
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        users_id: entry.users_id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })
    
    // Calculate working days in month
    const currentMonth = startDate.getMonth()
    const currentYear = startDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)
    
    let workingDaysInMonth = 0
    const checkDate = new Date(monthStart)
    while (checkDate <= monthEnd) {
      if (checkDate.getDay() !== 0) {
        workingDaysInMonth++
      }
      checkDate.setDate(checkDate.getDate() + 1)
    }
    
    // Get monthly basic salary
    const monthlyBasicSalary = entry.user.personnelType?.basicSalary 
      ? Number(entry.user.personnelType.basicSalary) 
      : Number(entry.basicSalary) * 2
    
    const dailyRate = monthlyBasicSalary / workingDaysInMonth
    
    console.log(`📊 ${entry.user.name}:`)
    console.log(`   Monthly Salary: ₱${monthlyBasicSalary.toLocaleString()}`)
    console.log(`   Working Days: ${workingDaysInMonth}`)
    console.log(`   Daily Rate: ₱${dailyRate.toFixed(2)}`)
    
    // Calculate attendance deductions
    let totalAttendanceDeductions = 0
    let absenceCount = 0
    
    for (const record of attendanceRecords) {
      if (record.status === 'ABSENT') {
        totalAttendanceDeductions += dailyRate
        absenceCount++
      }
    }
    
    const oldDeductions = Number(entry.deductions)
    let oldAttendanceDeductions = 0
    if (entry.breakdownSnapshot) {
      try {
        const breakdown = JSON.parse(entry.breakdownSnapshot)
        oldAttendanceDeductions = Number(breakdown?.attendanceDeductions || 0)
      } catch (e) {
        // ignore
      }
    }
    const otherDeductions = oldDeductions - oldAttendanceDeductions
    
    const newTotalDeductions = totalAttendanceDeductions + otherDeductions
    const newNetPay = Number(entry.basicSalary) + Number(entry.overtime) - newTotalDeductions
    
    console.log(`   Old Attendance Deductions: ₱${oldAttendanceDeductions.toFixed(2)}`)
    console.log(`   New Attendance Deductions: ₱${totalAttendanceDeductions.toFixed(2)} (${absenceCount} absences)`)
    console.log(`   New Total Deductions: ₱${newTotalDeductions.toFixed(2)}`)
    console.log(`   New Net Pay: ₱${newNetPay.toFixed(2)}\n`)
    
    // Update the payroll entry
    let updatedBreakdown: any = {}
    if (entry.breakdownSnapshot) {
      try {
        updatedBreakdown = JSON.parse(entry.breakdownSnapshot)
      } catch (e) {
        // ignore
      }
    }
    updatedBreakdown.attendanceDeductions = totalAttendanceDeductions
    
    await prisma.payrollEntry.update({
      where: { payroll_entries_id: entry.payroll_entries_id },
      data: {
        deductions: newTotalDeductions,
        netPay: newNetPay,
        breakdownSnapshot: JSON.stringify(updatedBreakdown)
      }
    })
  }
  
  console.log('✅ Done!')
}

fixPayrollDeductions()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
