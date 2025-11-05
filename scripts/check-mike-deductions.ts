import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deductions = await prisma.deduction.findMany({
    where: {
      user: { name: 'Mike Johnson' },
      archivedAt: null
    },
    include: {
      deductionType: {
        select: {
          name: true,
          isMandatory: true
        }
      }
    }
  })

  console.log('\n📋 Mike Johnson\'s Deductions:')
  deductions.forEach(d => {
    console.log(`  ✓ ${d.deductionType.name}: isMandatory=${d.deductionType.isMandatory} (amount: ₱${d.amount})`)
  })
  console.log('')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
