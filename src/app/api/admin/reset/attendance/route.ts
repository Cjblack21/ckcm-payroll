import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { users_id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    console.log('🗑️ Starting attendance reset...')
    
    // Delete all attendance-related deductions (Late Arrival, Early Timeout, Absence)
    console.log('🗑️ Step 1: Deleting attendance-related deductions...')
    const deductionTypes = await prisma.deductionType.findMany({
      where: {
        OR: [
          { name: 'Late Arrival' },
          { name: 'Early Timeout' },
          { name: 'Absence' }
        ]
      }
    })
    
    const deductionTypeIds = deductionTypes.map(dt => dt.deduction_types_id)
    const deductionsDeleted = await prisma.deduction.deleteMany({
      where: {
        deduction_types_id: { in: deductionTypeIds }
      }
    })
    console.log(`✅ Deleted ${deductionsDeleted.count} attendance-related deductions`)
    
    // Delete all attendance records
    console.log('🗑️ Step 2: Deleting all attendance records...')
    const attendanceDeleted = await prisma.attendance.deleteMany({})
    console.log(`✅ Deleted ${attendanceDeleted.count} attendance records`)

    return NextResponse.json({ 
      message: "All attendance data and related deductions have been deleted successfully",
      deletedCount: {
        attendance: attendanceDeleted.count,
        deductions: deductionsDeleted.count
      }
    })
  } catch (error) {
    console.error("Error resetting attendance:", error)
    return NextResponse.json(
      { error: "Failed to reset attendance data" },
      { status: 500 }
    )
  }
}
