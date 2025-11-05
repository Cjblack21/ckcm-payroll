const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const deductions = await prisma.deduction.findMany({
    where: {
      deductionType: {
        name: {
          in: ['Absence Deduction', 'Absent']
        }
      },
      appliedAt: {
        gte: today
      }
    },
    include: {
      deductionType: true,
      user: {
        select: {
          name: true
        }
      }
    }
  })
  
  console.log('=== TODAY\'S ABSENCE DEDUCTIONS ===')
  console.log('Count:', deductions.length)
  console.log('')
  
  deductions.forEach(d => {
    console.log(`User: ${d.user.name}`)
    console.log(`Amount: ₱${d.amount}`)
    console.log(`Type: ${d.deductionType.name}`)
    console.log(`Applied At: ${d.appliedAt}`)
    console.log('---')
  })
  
  await prisma.$disconnect()
}

main()
