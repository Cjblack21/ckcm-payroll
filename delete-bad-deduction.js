const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Searching for ₱3,333.33 deduction...')
  
  // Find deductions with amount 3333.33
  const badDeductions = await prisma.deduction.findMany({
    where: {
      amount: {
        gte: 3333.32,
        lte: 3333.34
      }
    },
    include: {
      user: { select: { name: true } },
      deductionType: { select: { name: true } }
    }
  })
  
  console.log(`Found ${badDeductions.length} deductions:`)
  badDeductions.forEach(d => {
    console.log(`- ID: ${d.deductions_id}, User: ${d.user.name}, Type: ${d.deductionType.name}, Amount: ₱${d.amount}, Applied: ${d.appliedAt}`)
  })
  
  if (badDeductions.length > 0) {
    console.log('\n🗑️  Deleting these deductions...')
    const result = await prisma.deduction.deleteMany({
      where: {
        deductions_id: {
          in: badDeductions.map(d => d.deductions_id)
        }
      }
    })
    console.log(`✅ Deleted ${result.count} deductions`)
  } else {
    console.log('No deductions found with that amount')
  }
  
  // Also delete payroll entries with those deductions
  console.log('\n🔍 Searching for payroll entries...')
  const payrollEntries = await prisma.payrollEntry.findMany({
    where: {
      deductions: {
        gte: 3333.32,
        lte: 3333.34
      }
    },
    include: {
      user: { select: { name: true } }
    }
  })
  
  console.log(`Found ${payrollEntries.length} payroll entries:`)
  payrollEntries.forEach(p => {
    console.log(`- User: ${p.user.name}, Deductions: ₱${p.deductions}, Period: ${p.periodStart} to ${p.periodEnd}`)
  })
  
  if (payrollEntries.length > 0) {
    console.log('\n🗑️  Deleting these payroll entries...')
    const result = await prisma.payrollEntry.deleteMany({
      where: {
        payroll_entries_id: {
          in: payrollEntries.map(p => p.payroll_entries_id)
        }
      }
    })
    console.log(`✅ Deleted ${result.count} payroll entries`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
