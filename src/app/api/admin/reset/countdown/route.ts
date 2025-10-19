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

    // Reset the payroll release countdown by clearing period dates
    const settings = await prisma.attendanceSettings.findFirst()
    
    if (settings) {
      await prisma.attendanceSettings.update({
        where: { attendance_settings_id: settings.attendance_settings_id },
        data: {
          periodStart: null,
          periodEnd: null,
        },
      })
    }

    return NextResponse.json({ 
      message: "Payroll release countdown has been reset to zero successfully"
    })
  } catch (error) {
    console.error("Error resetting countdown:", error)
    return NextResponse.json(
      { error: "Failed to reset countdown" },
      { status: 500 }
    )
  }
}
