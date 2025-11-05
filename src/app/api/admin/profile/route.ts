import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log("[Profile API] Session:", { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userName: session?.user?.name
    })
    
    if (!session || session.user.role !== "ADMIN") {
      console.log("[Profile API] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!session.user.id) {
      console.log("[Profile API] No user ID in session")
      return NextResponse.json({ error: "Invalid session" }, { status: 400 })
    }

    console.log("[Profile API] Fetching user with ID:", session.user.id)
    const user = await prisma.user.findUnique({
      where: { users_id: session.user.id },
      select: {
        users_id: true,
        name: true,
        email: true,
        avatar: true,
      },
    })

    if (!user) {
      console.log("[Profile API] User not found in database:", session.user.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    console.error("Error fetching admin profile:", error)
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    )
  }
}
