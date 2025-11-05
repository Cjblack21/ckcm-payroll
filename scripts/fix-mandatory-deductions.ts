import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Update all deductions that were created through "Add Mandatory Deductions"
  // to have isMandatory = true
  
  // Update the standard mandatory deductions
  const standardMandatory = ['PhilHealth', 'SSS', 'Pag-IBIG']
  
  for (const name of standardMandatory) {
    await prisma.deductionType.updateMany({
      where: { name },
      data: { isMandatory: true }
    })
  }
  
  // Update custom mandatory deductions that have "Mandatory deduction" in description
  await prisma.deductionType.updateMany({
    where: {
      description: {
        contains: 'Mandatory deduction'
      }
    },
    data: { isMandatory: true }
  })
  
  console.log('✅ Updated mandatory deductions successfully!')
  
  // Show the results
  const mandatory = await prisma.deductionType.findMany({
    where: { isMandatory: true }
  })
  
  console.log('\nMandatory Deductions:')
  mandatory.forEach(d => {
    console.log(`  - ${d.name} (₱${d.amount})`)
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
