import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if test1 exists
  const test1 = await prisma.deductionType.findFirst({
    where: { name: 'test1' }
  })
  
  if (test1) {
    await prisma.deductionType.update({
      where: { deduction_types_id: test1.deduction_types_id },
      data: { isMandatory: true }
    })
    console.log('✅ Updated test1 to mandatory')
  } else {
    console.log('❌ test1 not found in database')
  }
  
  // Show all current deductions
  const all = await prisma.deductionType.findMany({
    orderBy: { isMandatory: 'desc' }
  })
  
  console.log('\n📋 All Deduction Types:')
  console.log('\nMandatory:')
  all.filter(d => d.isMandatory).forEach(d => {
    console.log(`  ✓ ${d.name}: ₱${d.amount}`)
  })
  
  console.log('\nOther:')
  all.filter(d => !d.isMandatory).forEach(d => {
    console.log(`  - ${d.name}: ₱${d.amount}`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
