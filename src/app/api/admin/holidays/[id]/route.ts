import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, date, type, description } = await request.json()

    if (!name || !date || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if holiday exists
    const existingHoliday = await prisma.holiday.findUnique({
      where: { holidays_id: params.id }
    })

    if (!existingHoliday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 })
    }

    // Check if another holiday already exists on this date (excluding current one)
    const duplicateHoliday = await prisma.holiday.findFirst({
      where: { 
        date: new Date(date),
        holidays_id: { not: params.id }
      }
    })

    if (duplicateHoliday) {
      return NextResponse.json({ error: 'Another holiday already exists on this date' }, { status: 400 })
    }

    const holiday = await prisma.holiday.update({
      where: { holidays_id: params.id },
      data: {
        name,
        date: new Date(date),
        type,
        description: description || null
      }
    })

    return NextResponse.json({ holiday })
  } catch (error) {
    console.error('Error updating holiday:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if holiday exists
    const existingHoliday = await prisma.holiday.findUnique({
      where: { holidays_id: params.id }
    })

    if (!existingHoliday) {
      return NextResponse.json({ error: 'Holiday not found' }, { status: 404 })
    }

    await prisma.holiday.delete({
      where: { holidays_id: params.id }
    })

    return NextResponse.json({ message: 'Holiday deleted successfully' })
  } catch (error) {
    console.error('Error deleting holiday:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}











