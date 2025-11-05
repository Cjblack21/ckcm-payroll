const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Adding breakdownSnapshot column to payroll_entries...')
  
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `payroll_entries` ADD COLUMN `breakdownSnapshot` LONGTEXT NULL'
    )
    console.log('✅ Column added successfully!')
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('✅ Column already exists!')
    } else {
      console.error('❌ Error:', error.message)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
