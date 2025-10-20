const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding James Bernard Febrio...')
  
  const user = await prisma.user.findFirst({
    where: {
      name: {
        contains: 'James'
      }
    }
  })
  
  if (!user) {
    console.log('User not found')
    return
  }
  
  console.log(`Found user: ${user.name} (ID: ${user.users_id})`)
  
  // Find ALL deductions for this user
  const allDeductions = await prisma.deduction.findMany({
    where: {
      users_id: user.users_id
    },
    include: {
      deductionType: { select: { name: true } }
    },
    orderBy: {
      appliedAt: 'desc'
    }
  })
  
  console.log(`\n📋 Found ${allDeductions.length} deductions:`)
  allDeductions.forEach(d => {
    console.log(`- Type: ${d.deductionType.name}, Amount: ₱${d.amount}, Applied: ${d.appliedAt.toISOString().split('T')[0]}`)
  })
  
  if (allDeductions.length > 0) {
    console.log('\n🗑️  DELETING ALL DEDUCTIONS for James...')
    const result = await prisma.deduction.deleteMany({
      where: {
        users_id: user.users_id
      }
    })
    console.log(`✅ Deleted ${result.count} deductions`)
  }
  
  // Also delete any payroll entries
  console.log('\n🗑️  Deleting payroll entries...')
  const payrollResult = await prisma.payrollEntry.deleteMany({
    where: {
      users_id: user.users_id
    }
  })
  console.log(`✅ Deleted ${payrollResult.count} payroll entries`)
  
  console.log('\n✨ All deductions and payroll entries deleted!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
