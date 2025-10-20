const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkPayrollState() {
  try {
    console.log('🔍 Checking payroll state...\n')

    // 1. Check attendance settings
    const settings = await prisma.attendanceSettings.findFirst()
    if (settings) {
      console.log('📅 CURRENT PERIOD SETTINGS:')
      console.log(`   Start: ${settings.periodStart.toISOString().split('T')[0]}`)
      console.log(`   End:   ${settings.periodEnd.toISOString().split('T')[0]}`)
      console.log(`   Release Time: ${settings.timeOutEnd || 'Not set'}\n`)
    } else {
      console.log('❌ No attendance settings found\n')
    }

    // 2. Check payroll entries
    const pendingEntries = await prisma.payrollEntry.count({ where: { status: 'PENDING' } })
    const releasedEntries = await prisma.payrollEntry.count({ where: { status: 'RELEASED' } })
    const archivedEntries = await prisma.payrollEntry.count({ where: { status: 'ARCHIVED' } })

    console.log('📊 PAYROLL ENTRIES COUNT:')
    console.log(`   Pending:  ${pendingEntries}`)
    console.log(`   Released: ${releasedEntries}`)
    console.log(`   Archived: ${archivedEntries}\n`)

    // 3. Check if there are entries for current period
    if (settings) {
      const currentPeriodEntries = await prisma.payrollEntry.findMany({
        where: {
          periodStart: settings.periodStart,
          periodEnd: settings.periodEnd
        },
        select: {
          status: true,
          user: {
            select: { name: true }
          }
        }
      })

      if (currentPeriodEntries.length > 0) {
        console.log('📋 CURRENT PERIOD ENTRIES:')
        currentPeriodEntries.forEach(entry => {
          console.log(`   ${entry.user.name}: ${entry.status}`)
        })
        console.log('')
      } else {
        console.log('✅ No entries for current period (ready to generate)\n')
      }
    }

    // 4. Expected behavior
    console.log('✅ EXPECTED BEHAVIOR:')
    console.log('   1. Page shows "Generated: No" (if no entries for current period)')
    console.log('   2. "Generate Payroll" button is ENABLED')
    console.log('   3. Clicking it will create PENDING entries in database')
    console.log('   4. After generation, "Release Payroll" button appears')
    console.log('   5. Release is available at the end of period + release time\n')

    // 5. What you should see
    if (pendingEntries === 0 && releasedEntries === 0) {
      console.log('🎯 CURRENT STATE: Ready for new payroll generation')
      console.log('   - Generate button should be ENABLED')
      console.log('   - Click it to start new payroll cycle\n')
    } else if (pendingEntries > 0) {
      console.log('🎯 CURRENT STATE: Payroll generated (pending release)')
      console.log('   - Generate button should be DISABLED')
      console.log('   - Release button should appear when period ends\n')
    } else if (releasedEntries > 0) {
      console.log('⚠️  WARNING: Released entries still exist!')
      console.log('   - These should have been archived')
      console.log('   - Run: node fix-payroll.js to clean up\n')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPayrollState()
