import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import path from "path"

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's current avatar
    const user = await prisma.user.findUnique({
      where: { users_id: session.user.id },
      select: { avatar: true },
    })

    // Delete file if exists
    if (user?.avatar && user.avatar.startsWith("/uploads/")) {
      try {
        const filepath = path.join(process.cwd(), "public", user.avatar)
        await unlink(filepath)
      } catch (error) {
        // File might not exist, continue anyway
        console.warn("Could not delete avatar file:", error)
      }
    }

    // Remove avatar from database
    await prisma.user.update({
      where: { users_id: session.user.id },
      data: { avatar: null },
    })

    return NextResponse.json({ message: "Avatar removed successfully" })
  } catch (error) {
    console.error("Error removing avatar:", error)
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    )
  }
}
