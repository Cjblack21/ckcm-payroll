import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Removing "Absence Deduction" type from database...')
  
  try {
    // Find the Absence Deduction type
    const absenceDeductionType = await prisma.deductionType.findFirst({
      where: {
        name: 'Absence Deduction'
      }
    })
    
    if (!absenceDeductionType) {
      console.log('✅ No "Absence Deduction" type found in database')
      return
    }
    
    console.log(`📋 Found "Absence Deduction" type with ID: ${absenceDeductionType.deduction_types_id}`)
    
    // Delete all deductions of this type first
    const deletedDeductions = await prisma.deduction.deleteMany({
      where: {
        deduction_types_id: absenceDeductionType.deduction_types_id
      }
    })
    
    console.log(`🗑️  Deleted ${deletedDeductions.count} deduction records`)
    
    // Delete the deduction type
    await prisma.deductionType.delete({
      where: {
        deduction_types_id: absenceDeductionType.deduction_types_id
      }
    })
    
    console.log('✅ Successfully removed "Absence Deduction" type from database')
    console.log('✅ The attendance system will now automatically calculate absence deductions')
    
  } catch (error) {
    console.error('❌ Error removing Absence Deduction:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
