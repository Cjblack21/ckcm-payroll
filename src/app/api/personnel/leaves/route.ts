import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch user's own leave requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requests = await prisma.leaveRequest.findMany({
      where: { users_id: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error fetching personnel leave requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 }
    )
  }
}

// POST - Create new leave request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Received leave request body:", body)
    const { type, customLeaveType, startDate, endDate, days, isPaid, reason } = body

    // Validation
    if (!type || !startDate || !endDate || !days || reason === undefined) {
      console.error("Validation failed - missing fields:", { type, startDate, endDate, days, reason })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate custom leave type when type is CUSTOM
    if (type === "CUSTOM" && !customLeaveType?.trim()) {
      return NextResponse.json(
        { error: "Custom leave type name is required" },
        { status: 400 }
      )
    }

    console.log("Creating leave request with data:", {
      users_id: session.user.id,
      type,
      customLeaveType,
      startDate,
      endDate,
      days,
      isPaid,
      reason
    })

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        users_id: session.user.id,
        type,
        customLeaveType: type === "CUSTOM" ? customLeaveType : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: parseInt(days),
        isPaid: Boolean(isPaid),
        reason,
        status: "PENDING",
      },
    })

    console.log("Leave request created successfully:", leaveRequest)
    return NextResponse.json(leaveRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating leave request - Full error:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      { error: "Failed to create leave request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
