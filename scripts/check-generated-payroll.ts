import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGeneratedPayroll() {
  try {
    console.log('🔍 Checking generated payroll...\n')
    
    // Get attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    if (!settings || !settings.periodStart || !settings.periodEnd) {
      console.log('❌ No attendance settings or period found')
      return
    }
    
    console.log('⚙️  Current Period:')
    console.log(`   ${settings.periodStart.toISOString()} to ${settings.periodEnd.toISOString()}\n`)
    
    // Check for generated payroll entries
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: {
        periodStart: settings.periodStart,
        periodEnd: settings.periodEnd
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    if (payrollEntries.length === 0) {
      console.log('✅ No generated payroll entries found for this period')
      console.log('   The system is calculating payroll in real-time\n')
      return
    }
    
    console.log(`⚠️  Found ${payrollEntries.length} GENERATED payroll entries:`)
    console.log('   This means the payroll was FROZEN and is NOT updating in real-time!\n')
    
    for (const entry of payrollEntries) {
      console.log(`   - ${entry.user.name} (${entry.user.email})`)
      console.log(`     Basic Salary: ₱${entry.basicSalary}`)
      console.log(`     Overtime: ₱${entry.overtime}`)
      console.log(`     Deductions: ₱${entry.deductions}`)
      console.log(`     Net: ₱${entry.netPay}`)
      console.log(`     Status: ${entry.status}`)
      console.log('')
    }
    
    console.log('💡 SOLUTION: The generated payroll has FROZEN the values.')
    console.log('   To see real-time updates, you need to either:')
    console.log('   1. Delete the generated payroll entries (revert to real-time)')
    console.log('   2. Re-generate the payroll to update the calculations')
    console.log('\n   Run: npx tsx scripts/delete-generated-payroll.ts')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkGeneratedPayroll()
