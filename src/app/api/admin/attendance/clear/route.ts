import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.attendance.deleteMany({})

    return NextResponse.json({ success: true, deletedCount: result.count })
  } catch (error) {
    console.error('Error clearing attendance:', error)
    return NextResponse.json({ error: 'Failed to clear attendance' }, { status: 500 })
  }
}












