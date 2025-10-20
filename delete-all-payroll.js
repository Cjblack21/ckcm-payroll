const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding all payroll entries...')
  
  const allEntries = await prisma.payrollEntry.findMany({
    include: {
      user: { select: { name: true } }
    },
    orderBy: {
      periodStart: 'desc'
    }
  })
  
  console.log(`Found ${allEntries.length} payroll entries:`)
  allEntries.forEach(p => {
    console.log(`- User: ${p.user.name}, Deductions: ₱${p.deductions}, Net: ₱${p.netPay}, Period: ${p.periodStart.toISOString().split('T')[0]} to ${p.periodEnd.toISOString().split('T')[0]}, Status: ${p.status}`)
  })
  
  if (allEntries.length > 0) {
    console.log('\n🗑️  Deleting ALL payroll entries...')
    const result = await prisma.payrollEntry.deleteMany({})
    console.log(`✅ Deleted ${result.count} payroll entries`)
    console.log('\n✨ Now go to the payroll page and click "Generate Payroll" to create fresh entries')
  } else {
    console.log('No payroll entries found')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
