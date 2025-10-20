const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function completeReset() {
  try {
    console.log('🔧 Starting complete payroll reset...\n')

    // 1. Archive ALL released and pending entries
    const archived = await prisma.payrollEntry.updateMany({
      where: { 
        OR: [
          { status: 'RELEASED' },
          { status: 'PENDING' }
        ]
      },
      data: { status: 'ARCHIVED' }
    })
    console.log(`✅ Archived ${archived.count} entries (released + pending)\n`)

    // 2. Set proper semi-monthly period (15 days)
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings) {
      console.error('❌ No attendance settings found')
      return
    }

    // Calculate proper 15-day period starting from Oct 20, 2025
    const periodStart = new Date('2025-10-20T00:00:00.000Z')
    const periodEnd = new Date('2025-11-04T23:59:59.999Z') // 15 days later

    console.log(`📅 Setting period:`)
    console.log(`   Start: ${periodStart.toISOString().split('T')[0]} (Oct 20)`)
    console.log(`   End:   ${periodEnd.toISOString().split('T')[0]} (Nov 4)`)
    console.log(`   Duration: 15 days (semi-monthly)\n`)

    await prisma.attendanceSettings.update({
      where: { attendance_settings_id: settings.attendance_settings_id },
      data: {
        periodStart,
        periodEnd,
        timeOutEnd: '17:00' // Ensure release time is set
      }
    })
    
    console.log('✅ Updated attendance settings\n')

    // 3. Verify no entries exist for new period
    const newPeriodEntries = await prisma.payrollEntry.count({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd
      }
    })

    if (newPeriodEntries > 0) {
      console.log(`⚠️  Found ${newPeriodEntries} entries for new period, deleting...`)
      await prisma.payrollEntry.deleteMany({
        where: {
          periodStart: periodStart,
          periodEnd: periodEnd
        }
      })
      console.log('✅ Deleted entries\n')
    }

    console.log('✅ COMPLETE RESET SUCCESSFUL!\n')
    console.log('🎉 Next steps:')
    console.log('   1. Refresh your payroll page')
    console.log('   2. You should see:')
    console.log('      - Period: Oct 20 - Nov 4, 2025')
    console.log('      - Generated: No')
    console.log('      - Generate Payroll button: ENABLED')
    console.log('   3. Click "Generate Payroll" to start new cycle')
    console.log('   4. Release will be available on Nov 4 at 17:00')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

completeReset()
