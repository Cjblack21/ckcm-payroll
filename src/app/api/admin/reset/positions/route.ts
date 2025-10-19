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

    // First, set all users' personnel_types_id to null
    await prisma.user.updateMany({
      where: {
        personnel_types_id: { not: null },
      },
      data: {
        personnel_types_id: null,
      },
    })

    // Delete all personnel types
    const result = await prisma.personnelType.deleteMany({})

    return NextResponse.json({ 
      message: "All position/personnel type data has been deleted successfully",
      deletedCount: result.count 
    })
  } catch (error) {
    console.error("Error resetting positions:", error)
    return NextResponse.json(
      { error: "Failed to reset positions data" },
      { status: 500 }
    )
  }
}
