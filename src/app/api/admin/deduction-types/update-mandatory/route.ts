import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // List of deduction types that should be marked as mandatory
    const mandatoryDeductionNames = [
      'SSS',
      'PhilHealth', 
      'Philhealth',
      'PHILHEALTH',
      'BIR',
      'Pag-IBIG',
      'Pagibig',
      'PAG-IBIG',
      'PAGIBIG'
    ]

    // Update all matching deduction types to be mandatory
    const result = await prisma.deductionType.updateMany({
      where: {
        name: {
          in: mandatoryDeductionNames
        }
      },
      data: {
        isMandatory: true
      }
    })

    console.log(`✅ Updated ${result.count} deduction types to mandatory`)

    // Fetch updated deduction types to show in response
    const updatedTypes = await prisma.deductionType.findMany({
      where: {
        name: {
          in: mandatoryDeductionNames
        }
      },
      select: {
        deduction_types_id: true,
        name: true,
        isMandatory: true,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `Updated ${result.count} deduction types to mandatory`,
      updatedTypes
    })
  } catch (error: any) {
    console.error('Error updating mandatory deduction types:', error)
    return NextResponse.json(
      { 
        error: "Failed to update deduction types", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}