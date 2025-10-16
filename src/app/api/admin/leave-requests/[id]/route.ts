import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    const body = await request.json().catch(() => ({}))
    const { action, comment } = body || {}

    if (!id || !action || !["APPROVE", "DENY"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const status = action === "APPROVE" ? "APPROVED" : "DENIED"

    const updated = await prisma.leaveRequest.update({
      where: { leave_requests_id: id },
      data: {
        status,
        admin_id: session.user.id,
        adminComment: typeof comment === "string" ? comment : null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating leave request:", error)
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 })
  }
}
