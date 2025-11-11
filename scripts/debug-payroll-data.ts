/**
 * Debug Payroll Data Script
 * 
 * This script inspects the payroll breakdown data to find where ₱800 is stored
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugPayrollData() {
  try {
    console.log('🔍 Inspecting payroll data...')

    // Get all payroll entries
    const payrollEntries = await prisma.payrollEntry.findMany({
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 // Just check the 5 most recent
    })

    console.log(`\n📊 Found ${payrollEntries.length} recent payroll entries\n`)

    for (const entry of payrollEntries) {
      console.log('═'.repeat(80))
      console.log(`👤 User: ${entry.user?.name || entry.user?.email}`)
      console.log(`📅 Period: ${entry.periodStart.toISOString().split('T')[0]} to ${entry.periodEnd.toISOString().split('T')[0]}`)
      console.log(`💰 Semi-Monthly Salary: ₱${entry.user?.personnelType?.basicSalary}`)
      console.log(`💸 Total Deductions: ₱${entry.deductions}`)
      console.log(`💵 Net Pay: ₱${entry.netPay}`)
      
      if (entry.breakdownSnapshot) {
        try {
          const breakdown = JSON.parse(entry.breakdownSnapshot) as any
          console.log('\n📋 BREAKDOWN DATA:')
          console.log(JSON.stringify(breakdown, null, 2))
          
          if (breakdown.attendanceDeductionDetails) {
            console.log('\n🚨 ATTENDANCE DEDUCTION DETAILS:')
            breakdown.attendanceDeductionDetails.forEach((detail: any, idx: number) => {
              console.log(`  ${idx + 1}. ${detail.description}: ₱${detail.amount}`)
              if (detail.description?.toLowerCase().includes('absence')) {
                console.log(`     ⚠️  ABSENCE DEDUCTION FOUND: ₱${detail.amount}`)
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
    console.error('❌ Error debugging payroll data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
debugPayrollData()
  .then(() => {
    console.log('✅ Debug completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error)
    process.exit(1)
  })
