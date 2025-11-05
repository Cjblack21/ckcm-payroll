/**
 * Fix Absence Deductions Script
 * 
 * This script recalculates all absence deductions in existing payroll records
 * to use the correct formula: (semi-monthly salary / working days in period)
 * instead of hardcoded values.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixAbsenceDeductions() {
  try {
    console.log('🔧 Starting absence deduction fix...')

    // Get all payroll entries with breakdown data
    const payrollEntries = await prisma.payrollEntry.findMany({
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    console.log(`📊 Found ${payrollEntries.length} payroll entries to check`)

    let fixedCount = 0

    for (const entry of payrollEntries) {
      if (!entry.breakdown || !entry.user?.personnelType) {
        continue
      }

      const breakdown = entry.breakdown as any
      const attendanceDeductionDetails = breakdown.attendanceDeductionDetails || []
      
      // Check if there are any absence deductions
      const absenceDeductions = attendanceDeductionDetails.filter((d: any) => 
        d.description?.toLowerCase().includes('absence')
      )

      if (absenceDeductions.length === 0) {
        continue
      }

      // Calculate correct values
      const periodStart = new Date(entry.periodStart)
      const periodEnd = new Date(entry.periodEnd)
      
      // Count working days (exclude Sundays)
      let workingDays = 0
      const currentDate = new Date(periodStart)
      while (currentDate <= periodEnd) {
        if (currentDate.getDay() !== 0) { // Exclude Sundays
          workingDays++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const semiMonthlySalary = Number(entry.user.personnelType.basicSalary)
      const correctDailyDeduction = semiMonthlySalary / workingDays

      // Update each absence deduction
      let hasChanges = false
      let totalOldDeductions = 0
      let totalNewDeductions = 0

      for (const deduction of absenceDeductions) {
        const oldAmount = deduction.amount
        totalOldDeductions += oldAmount

        // Only update if the amount is incorrect (e.g., 800)
        if (Math.abs(oldAmount - correctDailyDeduction) > 0.01) {
          deduction.amount = correctDailyDeduction
          totalNewDeductions += correctDailyDeduction
          hasChanges = true
        } else {
          totalNewDeductions += oldAmount
        }
      }

      if (hasChanges) {
        // Recalculate total attendance deductions
        const otherAttendanceDeductions = attendanceDeductionDetails
          .filter((d: any) => !d.description?.toLowerCase().includes('absence'))
          .reduce((sum: number, d: any) => sum + d.amount, 0)

        const newTotalAttendanceDeductions = totalNewDeductions + otherAttendanceDeductions

        // Update breakdown
        breakdown.attendanceDeductionDetails = attendanceDeductionDetails
        breakdown.totalAttendanceDeductions = newTotalAttendanceDeductions

        // Recalculate total deductions and net pay
        const loanDeductions = breakdown.loanDeductions || 0
        const otherDeductions = breakdown.otherDeductionDetails?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0
        const totalDeductions = newTotalAttendanceDeductions + loanDeductions + otherDeductions

        const grossPay = entry.basicSalary + (entry.overtime || 0)
        const newNetPay = Math.max(0, grossPay - totalDeductions)

        // Update the payroll entry
        await prisma.payrollEntry.update({
          where: { payroll_entries_id: entry.payroll_entries_id },
          data: {
            breakdown: breakdown,
            deductions: totalDeductions,
            netPay: newNetPay
          }
        })

        console.log(`✅ Fixed ${entry.user.name || entry.user.email}:`)
        console.log(`   Old absence deduction: ₱${totalOldDeductions.toFixed(2)}`)
        console.log(`   New absence deduction: ₱${totalNewDeductions.toFixed(2)}`)
        console.log(`   Working days: ${workingDays}`)
        console.log(`   Daily rate: ₱${correctDailyDeduction.toFixed(2)}`)

        fixedCount++
      }
    }

    console.log(`\n🎉 Completed! Fixed ${fixedCount} payroll entries`)

  } catch (error) {
    console.error('❌ Error fixing absence deductions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixAbsenceDeductions()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
