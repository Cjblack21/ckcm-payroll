const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding RELEASED payroll entries...\n')
  
  // Find all RELEASED payroll entries
  const releasedPayrolls = await prisma.payrollEntry.findMany({
    where: { status: 'RELEASED' },
    select: {
      payroll_entries_id: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      user: {
        select: { name: true }
      }
    }
  })
  
  console.log(`Found ${releasedPayrolls.length} RELEASED payroll entries:\n`)
  
  releasedPayrolls.forEach((p, i) => {
    console.log(`${i + 1}. ${p.user.name}`)
    console.log(`   Period: ${p.periodStart} to ${p.periodEnd}`)
    console.log(`   Status: ${p.status}`)
    console.log()
  })
  
  if (releasedPayrolls.length > 0) {
    console.log('📦 Archiving all RELEASED payroll entries...\n')
    
    const result = await prisma.payrollEntry.updateMany({
      where: { status: 'RELEASED' },
      data: { status: 'ARCHIVED' }
    })
    
    console.log(`✅ Archived ${result.count} payroll entries`)
    console.log('\n✅ Done! Personnel should now see "No Current Payroll"')
  } else {
    console.log('✅ No RELEASED payroll entries found - nothing to archive')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
