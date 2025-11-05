import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - Remove an overload pay record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    await prisma.overloadPay.delete({
      where: { overload_pays_id: id }
    })

    return NextResponse.json({ success: true, message: "Overload pay removed" })
  } catch (error) {
    console.error("Error deleting overload pay:", error)
    return NextResponse.json({ error: "Failed to delete overload pay" }, { status: 500 })
  }
}

// PUT - Update an overload pay record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { amount, notes } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const updatedOverloadPay = await prisma.overloadPay.update({
      where: { overload_pays_id: id },
      data: {
        amount: Number(amount),
        notes: notes || null
      }
    })

    return NextResponse.json({ success: true, data: updatedOverloadPay })
  } catch (error) {
    console.error("Error updating overload pay:", error)
    return NextResponse.json({ error: "Failed to update overload pay" }, { status: 500 })
  }
}
