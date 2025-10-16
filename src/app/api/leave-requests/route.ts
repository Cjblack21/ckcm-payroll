import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = session.user.id

    const requests = await prisma.leaveRequest.findMany({
      where: { users_id: userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error fetching leave requests:", error)
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "PERSONNEL") {
      return NextResponse.json({ error: "Only personnel can request leave" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { type, startDate, endDate, reason } = body || {}

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validTypes = ["ANNUAL", "SICK", "UNPAID"] as const
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid leave type" }, { status: 400 })
    }

    const s = new Date(startDate)
    const e = new Date(endDate)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 })
    }
    if (e < s) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    const days = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const isPaid = type !== "UNPAID"

    const created = await prisma.leaveRequest.create({
      data: {
        users_id: session.user.id,
        type,
        startDate: s,
        endDate: e,
        days,
        isPaid,
        reason: typeof reason === "string" ? reason : null,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating leave request:", error)
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 })
  }
}
