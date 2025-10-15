import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.attendanceSettings.findFirst()
    return NextResponse.json({ settings: settings || null })
  } catch (error) {
    console.error('Error fetching attendance settings (public):', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}




















