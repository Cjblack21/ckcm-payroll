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
  
  // Calculate what it SHOULD be
  const correctWorkingDays = calculateWorkingDaysInPhilippines(start, end)
  
  console.log('📅 Period:', start.toISOString().split('T')[0], 'to', end.toISOString().split('T')[0])
  console.log('✅ Correct working days (full period):', correctWorkingDays)
  console.log('✅ Correct daily rate: ₱' + (10000 / correctWorkingDays).toFixed(2))
  
  // Check what the system is actually using
  console.log('\n❌ Bug: System is using 2 working days')
  console.log('❌ Wrong daily rate: ₱' + (10000 / 2).toFixed(2))
  
  console.log('\n🔍 The issue:')
  console.log('The system is only counting days that have PASSED (10/20, 10/21)')
  console.log('It should count ALL working days in the period (10/20, 10/21, 10/22)')
  console.log('')
  console.log('📝 Fix needed: Use FULL period working days for daily rate calculation')
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
