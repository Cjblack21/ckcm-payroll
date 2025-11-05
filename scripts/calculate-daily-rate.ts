import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function calculateDailyRate() {
  const users = await prisma.user.findMany({
    where: { role: 'PERSONNEL', isActive: true },
    include: { personnelType: true }
  })
  
  console.log('📊 Daily Salary Rates:\n')
  
  for (const user of users) {
    if (user.personnelType?.basicSalary) {
      const monthlySalary = Number(user.personnelType.basicSalary)
      const biweeklySalary = monthlySalary / 2
      
      // Assuming 22 working days per month
      const dailyRate = monthlySalary / 22
      
      console.log(`${user.name}:`)
      console.log(`  Monthly: ₱${monthlySalary.toFixed(2)}`)
      console.log(`  Biweekly: ₱${biweeklySalary.toFixed(2)}`)
      console.log(`  Daily Rate: ₱${dailyRate.toFixed(2)}`)
      
      if (Math.abs(dailyRate - 909.09) < 1) {
        console.log(`  ⭐ THIS MATCHES ₱909.09! (1 day absence deduction)`)
      }
      console.log('')
    }
  }
  
  await prisma.$disconnect()
}

calculateDailyRate()
