const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== DEBUGGING PERSONNEL PAYROLL ===\n')
  
  // Get attendance settings
  const settings = await prisma.attendanceSettings.findFirst()
  console.log('📅 Attendance Settings:')
  console.log('  Period Start:', settings?.periodStart)
  console.log('  Period End:', settings?.periodEnd)
  console.log()
  
  // Get all payroll entries for Mike Johnson
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Mike Johnson' } },
    select: { users_id: true, name: true, email: true }
  })
  
  if (!user) {
    console.log('❌ User Mike Johnson not found')
    return
  }
  
  console.log('👤 User:', user.name, '(', user.users_id, ')')
  console.log()
  
  // Get all payroll entries for this user
  const allPayrolls = await prisma.payrollEntry.findMany({
    where: { users_id: user.users_id },
    orderBy: { createdAt: 'desc' },
    select: {
      payroll_entries_id: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      netPay: true,
      createdAt: true,
      releasedAt: true
    }
  })
  
  console.log(`💰 Found ${allPayrolls.length} payroll entries:`)
  allPayrolls.forEach((p, i) => {
    console.log(`\n${i + 1}. Payroll ID: ${p.payroll_entries_id}`)
    console.log(`   Period: ${p.periodStart} to ${p.periodEnd}`)
    console.log(`   Status: ${p.status}`)
    console.log(`   Net Pay: ${p.netPay}`)
    console.log(`   Created: ${p.createdAt}`)
    console.log(`   Released: ${p.releasedAt || 'Not released'}`)
  })
  
  console.log('\n=== CHECKING QUERY LOGIC ===\n')
  
  if (settings) {
    const periodStartDate = new Date(settings.periodStart)
    periodStartDate.setHours(0, 0, 0, 0)
    const periodEndDate = new Date(settings.periodEnd)
    periodEndDate.setHours(23, 59, 59, 999)
    
    console.log('🔍 Query range:')
    console.log('  Start range:', periodStartDate, 'to', new Date(periodStartDate.getTime() + 24 * 60 * 60 * 1000))
    console.log('  End range:', new Date(periodEndDate.getTime() - 24 * 60 * 60 * 1000), 'to', periodEndDate)
    console.log()
    
    // Try the actual query
    const foundPayroll = await prisma.payrollEntry.findFirst({
      where: { 
        users_id: user.users_id,
        periodStart: {
          gte: periodStartDate,
          lte: new Date(periodStartDate.getTime() + 24 * 60 * 60 * 1000)
        },
        periodEnd: {
          gte: new Date(periodEndDate.getTime() - 24 * 60 * 60 * 1000),
          lte: periodEndDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (foundPayroll) {
      console.log('✅ Query FOUND payroll:', foundPayroll.payroll_entries_id)
      console.log('   Status:', foundPayroll.status)
      console.log('   Period:', foundPayroll.periodStart, 'to', foundPayroll.periodEnd)
    } else {
      console.log('❌ Query FAILED to find payroll')
      console.log('\n📊 Comparing dates:')
      allPayrolls.forEach((p, i) => {
        const pStart = new Date(p.periodStart)
        const pEnd = new Date(p.periodEnd)
        console.log(`\n${i + 1}. ${p.payroll_entries_id}`)
        console.log(`   periodStart: ${pStart.toISOString()}`)
        console.log(`   settings.periodStart: ${settings.periodStart.toISOString()}`)
        console.log(`   Match: ${pStart.getTime() === settings.periodStart.getTime()}`)
        console.log(`   periodEnd: ${pEnd.toISOString()}`)
        console.log(`   settings.periodEnd: ${settings.periodEnd.toISOString()}`)
        console.log(`   Match: ${pEnd.getTime() === settings.periodEnd.getTime()}`)
      })
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
