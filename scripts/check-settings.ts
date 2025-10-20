import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.attendanceSettings.findFirst()
  
  console.log('\n⚙️ Current Attendance Settings:\n')
  console.log('Time In Window:')
  console.log('  - Start:', settings?.timeInStart || 'Not set')
  console.log('  - End:', settings?.timeInEnd || 'Not set')
  console.log('\nTime Out Window:')
  console.log('  - Start:', settings?.timeOutStart || 'Not set')
  console.log('  - End:', settings?.timeOutEnd || 'Not set')
  console.log('\nAuto-mark features:')
  console.log('  - Auto Mark Absent:', settings?.autoMarkAbsent ? 'Enabled' : 'Disabled')
  console.log('  - Auto Mark Late:', settings?.autoMarkLate ? 'Enabled' : 'Disabled')
  console.log('\nPayroll Period:')
  console.log('  - Start:', settings?.periodStart?.toISOString().split('T')[0] || 'Not set')
  console.log('  - End:', settings?.periodEnd?.toISOString().split('T')[0] || 'Not set')
  console.log('  - Release Time:', settings?.payrollReleaseTime || 'Not set')
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
