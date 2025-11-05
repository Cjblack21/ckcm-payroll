import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Updating mandatory deduction types...')

  // List of deduction types that should be marked as mandatory
  const mandatoryDeductionNames = [
    'SSS',
    'PhilHealth',
    'Philhealth',
    'PHILHEALTH',
    'BIR',
    'Pag-IBIG',
    'Pagibig',
    'PAG-IBIG',
    'PAGIBIG'
  ]

  // First, let's see what deduction types exist
  const allTypes = await prisma.deductionType.findMany({
    select: {
      deduction_types_id: true,
      name: true,
      isMandatory: true,
      isActive: true,
      amount: true
    }
  })

  console.log('\n📋 Current deduction types:')
  allTypes.forEach(type => {
    console.log(`  - ${type.name}: isMandatory=${type.isMandatory}, isActive=${type.isActive}, amount=₱${type.amount}`)
  })

  // Update all matching deduction types to be mandatory
  const result = await prisma.deductionType.updateMany({
    where: {
      name: {
        in: mandatoryDeductionNames
      }
    },
    data: {
      isMandatory: true
    }
  })

  console.log(`\n✅ Updated ${result.count} deduction types to mandatory`)

  // Fetch updated deduction types to show in response
  const updatedTypes = await prisma.deductionType.findMany({
    where: {
      name: {
        in: mandatoryDeductionNames
      }
    },
    select: {
      deduction_types_id: true,
      name: true,
      isMandatory: true,
      isActive: true,
      amount: true
    }
  })

  console.log('\n📋 Updated deduction types:')
  updatedTypes.forEach(type => {
    console.log(`  - ${type.name}: isMandatory=${type.isMandatory}, isActive=${type.isActive}, amount=₱${type.amount}`)
  })

  console.log('\n✨ Done!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
