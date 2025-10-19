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

    // Delete all related payroll data to reset everything to zero
    const [deductions, payrollEntries] = await Promise.all([
      prisma.deduction.deleteMany({}),
      prisma.payrollEntry.deleteMany({}),
    ])

    return NextResponse.json({ 
      message: "All payroll and deduction data has been deleted successfully",
      payrollDeleted: payrollEntries.count,
      deductionsDeleted: deductions.count
    })
  } catch (error) {
    console.error("Error resetting payroll:", error)
    return NextResponse.json(
      { error: "Failed to reset payroll data" },
      { status: 500 }
    )
  }
}
