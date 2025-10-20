const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixPayroll() {
  try {
    console.log('🔧 Starting payroll fix...')

    // 1. Archive all released payroll entries
    const archivedCount = await prisma.payrollEntry.updateMany({
      where: { status: 'RELEASED' },
      data: { status: 'ARCHIVED' }
    })
    console.log(`✅ Archived ${archivedCount.count} released payroll entries`)

    // 2. Delete all pending entries (they're corrupted)
    const deletedCount = await prisma.payrollEntry.deleteMany({
      where: { status: 'PENDING' }
    })
    console.log(`✅ Deleted ${deletedCount.count} pending payroll entries`)

    // 3. Get current settings
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (!settings) {
      console.error('❌ No attendance settings found')
      return
    }

    // 4. Calculate next semi-monthly period (15 days from today)
    const today = new Date()
    const periodStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodStart.getDate() + 14)
    periodEnd.setHours(23, 59, 59, 999)

    console.log(`📅 Setting new period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)

    // 5. Update settings with correct period
    await prisma.attendanceSettings.update({
      where: { attendance_settings_id: settings.attendance_settings_id },
      data: {
        periodStart,
        periodEnd
      }
    })
    
    console.log('✅ Updated attendance settings with new period')
    console.log('✅ Payroll state reset successfully!')
    console.log('')
    console.log('🎉 You can now:')
    console.log('   1. Refresh the payroll page')
    console.log('   2. Click "Generate Payroll"')
    console.log('   3. Release payroll when ready')

  } catch (error) {
    console.error('❌ Error fixing payroll:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPayroll()
