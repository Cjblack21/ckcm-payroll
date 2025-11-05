import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Updating mandatory deduction flags...')
  
  // Update mandatory deductions
  const result = await prisma.deductionType.updateMany({
    where: {
      name: {
        in: ['SSS', 'PHILHEALTH', 'PhilHealth', 'BIR', 'PAG-IBIG', 'Pag-IBIG', 'PAGIBIG']
      }
    },
    data: {
      isMandatory: true
    }
  })
  
  console.log(`✅ Updated ${result.count} deduction types`)
  
  // Show all deduction types
  const types = await prisma.deductionType.findMany({
    select: {
      name: true,
      isMandatory: true,
      isActive: true
    }
  })
  
  console.log('\n📋 All Deduction Types:')
  types.forEach(t => {
    console.log(`  - ${t.name}: Mandatory=${t.isMandatory}, Active=${t.isActive}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
