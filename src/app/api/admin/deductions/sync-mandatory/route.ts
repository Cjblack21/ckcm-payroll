import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Sync all active mandatory deductions to all active personnel
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all active mandatory deduction types
    const mandatoryTypes = await prisma.deductionType.findMany({
      where: {
        isMandatory: true,
        isActive: true
      },
      select: {
        deduction_types_id: true,
        amount: true,
        calculationType: true,
        percentageValue: true
      }
    })

    if (mandatoryTypes.length === 0) {
      return NextResponse.json({ 
        message: "No active mandatory deductions found",
        synced: 0 
      })
    }

    // Get all active personnel with their salaries
    const activePersonnel = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      select: { 
        users_id: true,
        personnelType: {
          select: { basicSalary: true }
        }
      }
    })

    if (activePersonnel.length === 0) {
      return NextResponse.json({ 
        message: "No active personnel found",
        synced: 0 
      })
    }

    let totalSynced = 0

    // For each mandatory deduction type
    for (const deductionType of mandatoryTypes) {
      // Get existing deductions for this type
      const existingDeductions = await prisma.deduction.findMany({
        where: { deduction_types_id: deductionType.deduction_types_id },
        select: { users_id: true }
      })
      const existingUserIds = new Set(existingDeductions.map(d => d.users_id))

      // Find personnel who don't have this deduction yet
      const missingPersonnel = activePersonnel.filter(user => !existingUserIds.has(user.users_id))

      // Create deductions for missing personnel
      if (missingPersonnel.length > 0) {
        await prisma.deduction.createMany({
          data: missingPersonnel.map(user => {
            let deductionAmount = deductionType.amount
            
            // Calculate percentage if needed
            if (deductionType.calculationType === 'PERCENTAGE' && deductionType.percentageValue && user.personnelType) {
              const salary = user.personnelType.basicSalary
              deductionAmount = salary.mul(deductionType.percentageValue).div(100)
            }
            
            return {
              users_id: user.users_id,
              deduction_types_id: deductionType.deduction_types_id,
              amount: deductionAmount,
              notes: 'Mandatory payroll deduction (auto-synced)'
            }
          }),
          skipDuplicates: true
        })
        totalSynced += missingPersonnel.length
      }
    }

    return NextResponse.json({ 
      message: `Successfully synced ${totalSynced} mandatory deductions`,
      synced: totalSynced,
      deductionTypes: mandatoryTypes.length,
      personnel: activePersonnel.length
    })

  } catch (error) {
    console.error('Error syncing mandatory deductions:', error)
    return NextResponse.json({ 
      error: 'Failed to sync mandatory deductions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
