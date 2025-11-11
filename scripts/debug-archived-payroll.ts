/**
 * Debug Archived Payroll Data Script
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugArchivedPayroll() {
  try {
    console.log('🔍 Inspecting archived payroll data...')

    // Get archived payroll records
    const archivedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        archivedAt: {
          not: null
        }
      },
      include: {
        user: true
      },
      orderBy: {
        releasedAt: 'desc'
      },
      take: 10
    })

    console.log(`\n📊 Found ${archivedPayrolls.length} archived payroll records\n`)

    for (const record of archivedPayrolls) {
      console.log('═'.repeat(80))
      console.log(`👤 User: ${record.user.name || record.user.email}`)
      console.log(`📅 Period: ${record.periodStart.toISOString()} to ${record.periodEnd.toISOString()}`)
      console.log(`💰 Basic Salary: ₱${record.basicSalary}`)
      console.log(`⏰ Overtime: ₱${record.overtime}`)
      console.log(`💸 Total Deductions: ₱${record.deductions}`)
      console.log(`💵 Net Pay: ₱${record.netPay}`)
      console.log(`📋 Status: ${record.status}`)
      
      if (record.breakdownSnapshot) {
        try {
          const breakdown = JSON.parse(record.breakdownSnapshot)
          if (breakdown?.attendanceDeductionDetails) {
            console.log('\n🚨 ATTENDANCE DEDUCTION DETAILS:')
            breakdown.attendanceDeductionDetails.forEach((detail: any, idx: number) => {
              console.log(`  ${idx + 1}. ${detail.description}: ₱${detail.amount}`)
              if (detail.amount === 800 || detail.amount === '800') {
                console.log(`     ⚠️  FOUND ₱800 DEDUCTION!`)
              }
            })
          }
        } catch (e) {
          console.log('⚠️  Could not parse breakdown snapshot')
        }
      }
      console.log('\n')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

debugArchivedPayroll()
  .then(() => {
    console.log('✅ Debug completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
