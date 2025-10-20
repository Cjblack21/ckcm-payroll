const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function calculateWorkingDays(startDate, endDate) {
  let count = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const day = current.getDay()
    // Count Mon-Fri (1-5)
    if (day >= 1 && day <= 5) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

async function showBreakdown() {
  console.log('\n========================================')
  console.log('📊 DETAILED DEDUCTION BREAKDOWN')
  console.log('========================================\n')

  // Get attendance settings
  const settings = await prisma.attendanceSettings.findFirst()
  if (!settings) {
    console.log('❌ No attendance settings found')
    await prisma.$disconnect()
    return
  }

  console.log('📅 PAYROLL PERIOD')
  console.log('  Start:', settings.periodStart.toISOString().split('T')[0])
  console.log('  End:', settings.periodEnd.toISOString().split('T')[0])
  
  const periodStart = new Date(settings.periodStart)
  const periodEnd = new Date(settings.periodEnd)
  
  // Calculate working days in period
  const workingDaysInPeriod = calculateWorkingDays(periodStart, periodEnd)
  console.log('  Working Days in Period:', workingDaysInPeriod)
  
  // Calculate working days in full month
  const currentMonth = periodStart.getMonth()
  const currentYear = periodStart.getFullYear()
  const monthStart = new Date(currentYear, currentMonth, 1)
  const monthEnd = new Date(currentYear, currentMonth + 1, 0)
  const workingDaysInMonth = calculateWorkingDays(monthStart, monthEnd)
  
  console.log('\n📅 FULL MONTH (for daily rate calculation)')
  console.log('  Month:', monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }))
  console.log('  Month Start:', monthStart.toISOString().split('T')[0])
  console.log('  Month End:', monthEnd.toISOString().split('T')[0])
  console.log('  Working Days in Month:', workingDaysInMonth)

  // Get user attendance
  const attendance = await prisma.attendance.findMany({
    where: {
      date: { gte: periodStart, lte: periodEnd }
    },
    include: {
      user: {
        include: {
          personnelType: true
        }
      }
    },
    orderBy: { date: 'asc' }
  })

  if (attendance.length === 0) {
    console.log('\n❌ No attendance records found for this period')
    await prisma.$disconnect()
    return
  }

  // Group by user
  const userMap = new Map()
  attendance.forEach(att => {
    const userId = att.users_id
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        name: att.user.name,
        email: att.user.email,
        monthlyBasic: att.user.personnelType?.basicSalary || 0,
        records: []
      })
    }
    userMap.get(userId).records.push(att)
  })

  // Show breakdown for each user
  for (const [userId, userData] of userMap) {
    console.log('\n========================================')
    console.log(`👤 USER: ${userData.name}`)
    console.log('========================================')
    console.log('  Email:', userData.email)
    console.log('  Monthly Basic Salary: ₱' + userData.monthlyBasic.toLocaleString('en-US', { minimumFractionDigits: 2 }))
    
    // Calculate daily rate based on MONTH
    const dailyRateMonth = userData.monthlyBasic / workingDaysInMonth
    console.log('\n💰 CALCULATION METHOD (MONTHLY)')
    console.log('  Formula: Monthly Salary ÷ Working Days in Month')
    console.log('  Calculation: ₱' + userData.monthlyBasic.toLocaleString() + ' ÷ ' + workingDaysInMonth + ' days')
    console.log('  Daily Rate: ₱' + dailyRateMonth.toFixed(2))
    
    // Calculate daily rate based on PERIOD (old/wrong method)
    const dailyRatePeriod = userData.monthlyBasic / workingDaysInPeriod
    console.log('\n❌ OLD CALCULATION METHOD (PERIOD) - WRONG!')
    console.log('  Formula: Monthly Salary ÷ Working Days in Period')
    console.log('  Calculation: ₱' + userData.monthlyBasic.toLocaleString() + ' ÷ ' + workingDaysInPeriod + ' days')
    console.log('  Daily Rate: ₱' + dailyRatePeriod.toFixed(2))
    console.log('  ⚠️  This inflates the daily rate!')

    console.log('\n📋 ATTENDANCE BREAKDOWN')
    console.log('  ' + '-'.repeat(80))
    console.log('  Date       | Status   | Time In  | Time Out | Hours | Deduction (Month) | Deduction (Period)')
    console.log('  ' + '-'.repeat(80))

    let totalDeductionMonth = 0
    let totalDeductionPeriod = 0
    let absentCount = 0
    let lateCount = 0
    let partialCount = 0

    userData.records.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0]
      const timeIn = record.timeIn ? new Date(record.timeIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'
      const timeOut = record.timeOut ? new Date(record.timeOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'
      
      let hours = 0
      if (record.timeIn && record.timeOut) {
        hours = (new Date(record.timeOut) - new Date(record.timeIn)) / (1000 * 60 * 60)
      }

      let deductionMonth = 0
      let deductionPeriod = 0

      if (record.status === 'ABSENT') {
        deductionMonth = dailyRateMonth
        deductionPeriod = dailyRatePeriod
        absentCount++
      } else if (record.status === 'LATE' && record.timeIn) {
        const expected = new Date(record.date)
        const [h, m] = (settings.timeInEnd || '09:30').split(':').map(Number)
        expected.setHours(h, m, 0, 0)
        const seconds = Math.max(0, (new Date(record.timeIn) - expected) / 1000)
        const perSecMonth = dailyRateMonth / 8 / 60 / 60
        const perSecPeriod = dailyRatePeriod / 8 / 60 / 60
        deductionMonth = Math.min(seconds * perSecMonth, dailyRateMonth * 0.5)
        deductionPeriod = Math.min(seconds * perSecPeriod, dailyRatePeriod * 0.5)
        lateCount++
      } else if (record.status === 'PARTIAL') {
        const hoursShort = Math.max(0, 8 - hours)
        const hourlyMonth = dailyRateMonth / 8
        const hourlyPeriod = dailyRatePeriod / 8
        deductionMonth = hoursShort * hourlyMonth
        deductionPeriod = hoursShort * hourlyPeriod
        partialCount++
      }

      totalDeductionMonth += deductionMonth
      totalDeductionPeriod += deductionPeriod

      const deductionMonthStr = deductionMonth > 0 ? '₱' + deductionMonth.toFixed(2) : '-'
      const deductionPeriodStr = deductionPeriod > 0 ? '₱' + deductionPeriod.toFixed(2) : '-'

      console.log(`  ${dateStr} | ${record.status.padEnd(8)} | ${timeIn.padEnd(8)} | ${timeOut.padEnd(8)} | ${hours.toFixed(1).padStart(5)} | ${deductionMonthStr.padStart(17)} | ${deductionPeriodStr.padStart(18)}`)
    })

    console.log('  ' + '-'.repeat(80))
    console.log('\n📊 SUMMARY')
    console.log('  Total Days:', userData.records.length)
    console.log('  Absent:', absentCount, '| Late:', lateCount, '| Partial:', partialCount)
    console.log('\n  ✅ Total Deduction (MONTHLY method):', '₱' + totalDeductionMonth.toFixed(2))
    console.log('  ❌ Total Deduction (PERIOD method):', '₱' + totalDeductionPeriod.toFixed(2))
    console.log('\n  💡 Difference:', '₱' + Math.abs(totalDeductionMonth - totalDeductionPeriod).toFixed(2))
    console.log('     The MONTHLY method is correct and fair!')
  }

  console.log('\n========================================')
  console.log('✅ BREAKDOWN COMPLETE')
  console.log('========================================\n')

  await prisma.$disconnect()
}

showBreakdown().catch(console.error)
