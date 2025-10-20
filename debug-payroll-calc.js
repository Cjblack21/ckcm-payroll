const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function calculateWorkingDaysInPhilippines(start, end) {
  let count = 0
  const current = new Date(start)
  
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0) { // Exclude Sundays
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

async function main() {
  console.log('🔍 Debugging Payroll Calculation...\n')
  
  // Get attendance settings
  const settings = await prisma.attendanceSettings.findFirst()
  console.log('Attendance Settings:')
  console.log('Period Start:', settings?.periodStart)
  console.log('Period End:', settings?.periodEnd)
  
  if (settings?.periodStart && settings?.periodEnd) {
    const periodStart = new Date(settings.periodStart)
    const periodEnd = new Date(settings.periodEnd)
    
    const workingDays = calculateWorkingDaysInPhilippines(periodStart, periodEnd)
    console.log('\n📊 Working Days Calculation:')
    console.log('Working Days in Period:', workingDays)
    
    // Get James' info
    const james = await prisma.user.findFirst({
      where: { name: { contains: 'James' } },
      include: { personnelType: true }
    })
    
    if (james) {
      const monthlyBasic = Number(james.personnelType?.basicSalary || 0)
      const semiMonthlyBasic = monthlyBasic * 0.5
      const dailySalary = workingDays > 0 ? semiMonthlyBasic / workingDays : 0
      
      console.log('\n💰 Salary Breakdown for', james.name)
      console.log('Monthly Basic Salary: ₱' + monthlyBasic.toFixed(2))
      console.log('Semi-Monthly Basic: ₱' + semiMonthlyBasic.toFixed(2))
      console.log('Daily Salary: ₱' + dailySalary.toFixed(2), '(₱' + semiMonthlyBasic.toFixed(2) + ' ÷ ' + workingDays + ' days)')
      console.log('\n✅ Expected deduction for 1 absent day: ₱' + dailySalary.toFixed(2))
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
