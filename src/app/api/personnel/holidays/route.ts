import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user.role !== 'PERSONNEL' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all holidays (personnel can view all holidays)
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' }
    })

    return NextResponse.json({ holidays })
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

