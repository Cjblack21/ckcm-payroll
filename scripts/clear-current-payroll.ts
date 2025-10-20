import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Clearing current payroll period data...\n')
  
  try {
    // Get attendance settings to find current period
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings?.periodStart || !settings?.periodEnd) {
      console.log('❌ No payroll period set in attendance settings')
      return
    }
    
    console.log(`📅 Current period: ${settings.periodStart.toISOString().split('T')[0]} to ${settings.periodEnd.toISOString().split('T')[0]}`)
    
    // Delete payroll entries for this period
    const deleted = await prisma.payrollEntry.deleteMany({
      where: {
        periodStart: settings.periodStart,
        periodEnd: settings.periodEnd
      }
    })
    
    console.log(`🗑️  Deleted ${deleted.count} payroll entries`)
    console.log('\n✅ Payroll data cleared! Now regenerate payroll to get fresh calculations.')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
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
