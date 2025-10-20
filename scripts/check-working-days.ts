import { PrismaClient } from '@prisma/client'
import { calculateWorkingDaysInPhilippines } from '../src/lib/timezone'

const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.attendanceSettings.findFirst()
  
  if (!settings?.periodStart || !settings?.periodEnd) {
    console.log('❌ No period set')
    return
  }
  
  const start = new Date(settings.periodStart)
  const end = new Date(settings.periodEnd)
  
  console.log('\n📅 Payroll Period:')
  console.log('  Start:', start.toISOString().split('T')[0])
  console.log('  End:', end.toISOString().split('T')[0])
  
  const workingDays = calculateWorkingDaysInPhilippines(start, end)
  
  console.log('\n📊 Working Days Calculation:')
  console.log('  Total working days:', workingDays)
  console.log('  (Excludes Sundays only)')
  
  console.log('\n💰 Daily Rate Calculation:')
  const semiMonthlySalary = 10000
  const dailyRate = semiMonthlySalary / workingDays
  console.log('  Semi-monthly salary: ₱10,000')
  console.log('  Daily rate: ₱' + dailyRate.toFixed(2))
  console.log('  Absence deduction: ₱' + dailyRate.toFixed(2) + ' (1 full day)')
  
  console.log('\n❌ Current Issue:')
  console.log('  Showing: ₱5,000 deduction')
  console.log('  This means system is using: 2 working days')
  console.log('  Should be using:', workingDays, 'working days')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
