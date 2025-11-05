import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const all = await prisma.deductionType.findMany()
  
  console.log('All Deduction Types:')
  all.forEach(d => {
    console.log(`  - ${d.name}: ₱${d.amount} | isMandatory: ${d.isMandatory} | description: "${d.description}"`)
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
