import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log("Leave requests - Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      role: session?.user?.role
    })
    
    if (!session || !session.user) {
      console.error("No session or user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Admin can see all leave requests, users can see only their own
    const whereClause = session.user.role === "ADMIN" 
      ? {} 
      : { users_id: session.user.id }

    console.log("Fetching leave requests with where clause:", whereClause)

    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { users_id: true, name: true, email: true } },
      },
    })

    console.log(`Found ${requests.length} leave requests`)

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error fetching leave requests:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : String(error))
    return NextResponse.json({ 
      error: "Failed to fetch leave requests",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
