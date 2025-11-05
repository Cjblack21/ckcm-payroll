/**
 * Debug Archived Payroll Data Script
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugArchivedPayroll() {
  try {
    console.log('🔍 Inspecting archived payroll data...')

    // Get archived payroll records
    const archivedPayrolls = await prisma.archivedPayroll.findMany({
      orderBy: {
        releasedAt: 'desc'
      },
      take: 10
    })

    console.log(`\n📊 Found ${archivedPayrolls.length} archived payroll records\n`)

    for (const record of archivedPayrolls) {
      const data = record.payrollData as any
      
      console.log('═'.repeat(80))
      console.log(`👤 User: ${data.userName || data.userEmail}`)
      console.log(`📅 Period: ${data.periodStart} to ${data.periodEnd}`)
      console.log(`💸 Total Deductions: ₱${data.deductions}`)
      console.log(`💵 Net Pay: ₱${data.netPay}`)
      
      if (data.breakdown?.attendanceDeductionDetails) {
        console.log('\n🚨 ATTENDANCE DEDUCTION DETAILS:')
        data.breakdown.attendanceDeductionDetails.forEach((detail: any, idx: number) => {
          console.log(`  ${idx + 1}. ${detail.description}: ₱${detail.amount}`)
          if (detail.amount === 800 || detail.amount === '800') {
            console.log(`     ⚠️  FOUND ₱800 DEDUCTION!`)
          }
        })
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
