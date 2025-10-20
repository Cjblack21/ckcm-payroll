import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Force removing all "Absence" related deductions from database...\n')
  
  try {
    // Find all deduction types with "Absence" or "Absent" in the name
    const absenceTypes = await prisma.deductionType.findMany({
      where: {
        OR: [
          { name: { contains: 'Absence' } },
          { name: { contains: 'absence' } },
          { name: { contains: 'Absent' } },
          { name: { contains: 'absent' } },
          { name: 'Absence Deduction' },
          { name: 'Absent' }
        ]
      }
    })
    
    if (absenceTypes.length === 0) {
      console.log('✅ No "Absence" related deduction types found')
    } else {
      console.log(`📋 Found ${absenceTypes.length} absence-related deduction type(s):`)
      absenceTypes.forEach(type => {
        console.log(`   - ${type.name} (ID: ${type.deduction_types_id})`)
      })
      console.log()
      
      // Delete all deductions of these types
      for (const type of absenceTypes) {
        const deletedDeductions = await prisma.deduction.deleteMany({
          where: {
            deduction_types_id: type.deduction_types_id
          }
        })
        console.log(`🗑️  Deleted ${deletedDeductions.count} deduction record(s) for "${type.name}"`)
        
        // Delete the deduction type
        await prisma.deductionType.delete({
          where: {
            deduction_types_id: type.deduction_types_id
          }
        })
        console.log(`✅ Deleted deduction type: "${type.name}"`)
      }
    }
    
    console.log('\n📊 Checking for any remaining absence deductions...')
    
    // Also check for individual deduction records that might reference absence
    const allDeductions = await prisma.deduction.findMany({
      include: {
        deductionType: true
      }
    })
    
    const absenceDeductions = allDeductions.filter(d => 
      d.deductionType.name.toLowerCase().includes('absence') ||
      d.deductionType.name.toLowerCase().includes('absent')
    )
    
    if (absenceDeductions.length > 0) {
      console.log(`⚠️  Found ${absenceDeductions.length} orphaned absence deduction record(s)`)
      for (const deduction of absenceDeductions) {
        await prisma.deduction.delete({
          where: { deductions_id: deduction.deductions_id }
        })
        console.log(`🗑️  Deleted orphaned deduction: ${deduction.deductionType.name}`)
      }
    } else {
      console.log('✅ No orphaned absence deduction records found')
    }
    
    console.log('\n✅ All absence-related deductions have been removed!')
    console.log('✅ The attendance system will now automatically calculate absence deductions')
    
  } catch (error) {
    console.error('❌ Error removing absence deductions:', error)
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
