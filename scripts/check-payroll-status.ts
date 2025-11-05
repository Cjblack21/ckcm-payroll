/**
 * Check current payroll and deduction status
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStatus() {
  try {
    // Check payroll entries
    console.log('📊 PAYROLL ENTRIES:')
    console.log('='.repeat(60))
    
    const payrolls = await prisma.payrollEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (payrolls.length === 0) {
      console.log('❌ No payroll entries found\n')
    } else {
      payrolls.forEach(p => {
        console.log(`\nUser: ${p.user.name} (${p.user.email})`)
        console.log(`Period: ${p.periodStart.toISOString().split('T')[0]} to ${p.periodEnd.toISOString().split('T')[0]}`)
        console.log(`Status: ${p.status}`)
        console.log(`Net Pay: ₱${Number(p.netPay).toFixed(2)}`)
        console.log(`Deductions: ₱${Number(p.deductions).toFixed(2)}`)
        if (p.releasedAt) {
          console.log(`Released: ${p.releasedAt.toISOString()}`)
        }
      })
    }

    // Check deductions
    console.log('\n\n💰 DEDUCTIONS (ACTIVE):')
    console.log('='.repeat(60))
    
    const activeDeductions = await prisma.deduction.findMany({
      where: {
        archivedAt: null
      },
      orderBy: { appliedAt: 'desc' },
      take: 10,
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
      }
    })

    if (activeDeductions.length === 0) {
      console.log('✅ No active deductions found\n')
    } else {
      activeDeductions.forEach(d => {
        console.log(`\n${d.user.name}: ${d.deductionType.name}`)
        console.log(`  Amount: ₱${Number(d.amount).toFixed(2)}`)
        console.log(`  Mandatory: ${d.deductionType.isMandatory ? 'YES' : 'NO'}`)
        console.log(`  Applied: ${d.appliedAt.toISOString().split('T')[0]}`)
        console.log(`  Archived: ${d.archivedAt ? 'YES (' + d.archivedAt.toISOString() + ')' : 'NO'}`)
      })
    }

    // Check archived deductions
    console.log('\n\n🗑️  DEDUCTIONS (ARCHIVED):')
    console.log('='.repeat(60))
    
    const archivedDeductions = await prisma.deduction.findMany({
      where: {
        archivedAt: { not: null }
      },
      orderBy: { archivedAt: 'desc' },
      take: 10,
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
      }
    })

    if (archivedDeductions.length === 0) {
      console.log('❌ No archived deductions found\n')
    } else {
      archivedDeductions.forEach(d => {
        console.log(`\n${d.user.name}: ${d.deductionType.name}`)
        console.log(`  Amount: ₱${Number(d.amount).toFixed(2)}`)
        console.log(`  Mandatory: ${d.deductionType.isMandatory ? 'YES' : 'NO'}`)
        console.log(`  Applied: ${d.appliedAt.toISOString().split('T')[0]}`)
        console.log(`  Archived: ${d.archivedAt?.toISOString()}`)
      })
    }

    console.log('\n' + '='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkStatus()
  .then(() => {
    console.log('\n✅ Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })
