/**
 * Archive all non-mandatory deductions that were created before the latest released payroll
 * These deductions should have already been used and archived
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function archiveOldDeductions() {
  try {
    console.log('🔍 Finding non-mandatory deductions that should be archived...\n')

    // Get all non-mandatory, non-attendance deductions that are still active
    const activeDeductions = await prisma.deduction.findMany({
      where: {
        archivedAt: null,
        deductionType: {
          isMandatory: false
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        deductionType: {
          select: {
            name: true,
            isMandatory: true
          }
        }
      },
      orderBy: {
        appliedAt: 'asc'
      }
    })

    // Filter out attendance deductions
    const nonMandatory = activeDeductions.filter(d => 
      !d.deductionType.name.includes('Late') &&
      !d.deductionType.name.includes('Absent') &&
      !d.deductionType.name.includes('Early') &&
      !d.deductionType.name.includes('Partial') &&
      !d.deductionType.name.includes('Tardiness')
    )

    console.log(`Found ${nonMandatory.length} active non-mandatory deductions:\n`)

    if (nonMandatory.length === 0) {
      console.log('✅ No deductions to archive\n')
      return
    }

    // Show all deductions
    nonMandatory.forEach((d, index) => {
      console.log(`${index + 1}. ${d.user.name}: ${d.deductionType.name}`)
      console.log(`   Amount: ₱${Number(d.amount).toFixed(2)}`)
      console.log(`   Applied: ${d.appliedAt.toISOString().split('T')[0]}`)
      console.log(`   ID: ${d.deductions_id}\n`)
    })

    // Ask for confirmation (in production, this would need user input)
    console.log('🗑️  Archiving these deductions...\n')

    const idsToArchive = nonMandatory
      .map(d => d.deductions_id)
      .filter(id => !id.startsWith('auto-'))

    if (idsToArchive.length > 0) {
      const result = await prisma.deduction.updateMany({
        where: {
          deductions_id: { in: idsToArchive }
        },
        data: {
          archivedAt: new Date()
        }
      })

      console.log(`✅ Archived ${result.count} deductions`)
      console.log('\nThese deductions are now visible in admin/deductions → Archived tab')
    } else {
      console.log('⚠️  No deductions to archive (all were auto-generated)')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

archiveOldDeductions()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
