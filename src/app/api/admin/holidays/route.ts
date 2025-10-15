import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' }
    })

    return NextResponse.json({ holidays })
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received holiday data:', body) // Debug log
    
    const { name, date, type, description } = body

    // Validate required fields
    if (!name || !date || !type) {
      console.log('Missing required fields:', { name: !!name, date: !!date, type: !!type })
      return NextResponse.json({ error: 'Missing required fields: name, date, and type are required' }, { status: 400 })
    }

    // Validate holiday type
    const validTypes = ['NATIONAL', 'RELIGIOUS', 'COMPANY']
    if (!validTypes.includes(type)) {
      console.log('Invalid holiday type:', type)
      return NextResponse.json({ error: `Invalid holiday type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    // Validate date format
    const holidayDate = new Date(date)
    if (isNaN(holidayDate.getTime())) {
      console.log('Invalid date format:', date)
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Check if holiday already exists on this date
    const existingHoliday = await prisma.holiday.findFirst({
      where: { date: holidayDate }
    })

    if (existingHoliday) {
      console.log('Holiday already exists on date:', date)
      return NextResponse.json({ error: 'Holiday already exists on this date' }, { status: 400 })
    }

    console.log('Creating holiday with data:', { name, date: holidayDate, type, description })
    
    const holiday = await prisma.holiday.create({
      data: {
        name: name.trim(),
        date: holidayDate,
        type: type as 'NATIONAL' | 'RELIGIOUS' | 'COMPANY',
        description: description?.trim() || null
      }
    })

    console.log('Successfully created holiday:', holiday)
    return NextResponse.json({ holiday }, { status: 201 })
  } catch (error) {
    console.error('Error creating holiday:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
