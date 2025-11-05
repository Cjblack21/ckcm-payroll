/**
 * Archive deductions from already-released payroll periods
 * 
 * This script finds all RELEASED payroll entries and archives their non-mandatory deductions
 * Run this once to clean up deductions that should have been archived on release
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function archiveReleasedPayrollDeductions() {
  try {
    console.log('🔍 Finding all RELEASED payroll entries...')

    // Get all released and archived payroll entries
    const releasedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        status: { in: ['RELEASED', 'ARCHIVED'] }
      },
      select: {
        users_id: true,
        periodStart: true,
        periodEnd: true,
        releasedAt: true
      },
      distinct: ['users_id', 'periodStart', 'periodEnd']
    })

    console.log(`✅ Found ${releasedPayrolls.length} released payroll entries`)

    let totalArchived = 0

    for (const payroll of releasedPayrolls) {
      console.log(`\n📋 Processing payroll for user ${payroll.users_id}`)
      console.log(`   Period: ${payroll.periodStart.toISOString()} to ${payroll.periodEnd.toISOString()}`)

      // Normalize period to day boundaries
      const startOfDayPH = new Date(payroll.periodStart)
      startOfDayPH.setHours(0, 0, 0, 0)
      const endOfDayPH = new Date(payroll.periodEnd)
      endOfDayPH.setHours(23, 59, 59, 999)

      // Get all non-mandatory deductions for this user in this period
      const userDeductions = await prisma.deduction.findMany({
        where: {
          users_id: payroll.users_id,
          archivedAt: null,
          deductionType: {
            isMandatory: false
          },
          appliedAt: {
            gte: startOfDayPH,
            lte: endOfDayPH
          }
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

      // Filter out attendance-related deductions (Late, Absent, etc.)
      const nonMandatory = userDeductions.filter(d => 
        !d.deductionType.name.includes('Late') &&
        !d.deductionType.name.includes('Absent') &&
        !d.deductionType.name.includes('Early') &&
        !d.deductionType.name.includes('Partial') &&
        !d.deductionType.name.includes('Tardiness')
      )

      if (nonMandatory.length > 0) {
        const idsToArchive = nonMandatory
          .map(d => d.deductions_id)
          .filter(id => !id.startsWith('auto-'))

        if (idsToArchive.length > 0) {
          console.log(`   🗑️  Found ${idsToArchive.length} non-mandatory deductions to archive:`)
          nonMandatory.forEach(d => {
            console.log(`      - ${d.deductionType.name}: ₱${d.amount}`)
          })

          // Archive them
          const result = await prisma.deduction.updateMany({
            where: {
              deductions_id: { in: idsToArchive }
            },
            data: {
              archivedAt: payroll.releasedAt || new Date()
            }
          })

          console.log(`   ✅ Archived ${result.count} deductions`)
          totalArchived += result.count
        } else {
          console.log(`   ℹ️  No deductions to archive (all auto-generated)`)
        }
      } else {
        console.log(`   ℹ️  No non-mandatory deductions found for this period`)
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`🎉 COMPLETE: Archived ${totalArchived} deductions from ${releasedPayrolls.length} released payroll periods`)
    console.log(`${'='.repeat(60)}`)

  } catch (error) {
    console.error('❌ Error archiving deductions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
archiveReleasedPayrollDeductions()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
