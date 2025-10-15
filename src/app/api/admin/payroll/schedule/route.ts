import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get current payroll schedule
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current active schedule
    const schedule = await prisma.payrollSchedule.findFirst({
      where: { isActive: true },
      orderBy: { scheduledDate: 'asc' }
    })

    return NextResponse.json({ 
      schedule: schedule ? {
        id: schedule.payroll_schedule_id,
        scheduledDate: schedule.scheduledDate.toISOString(),
        notes: schedule.notes,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      } : null
    })
  } catch (error) {
    console.error('Error fetching payroll schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

// POST - Create or update payroll schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduledDate, notes } = await request.json()

    if (!scheduledDate) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 })
    }

    // Deactivate any existing active schedules
    await prisma.payrollSchedule.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Create new schedule
    const schedule = await prisma.payrollSchedule.create({
      data: {
        scheduledDate: new Date(scheduledDate),
        notes: notes || null,
        isActive: true
      }
    })

    return NextResponse.json({ 
      message: 'Payroll schedule created successfully',
      schedule: {
        id: schedule.payroll_schedule_id,
        scheduledDate: schedule.scheduledDate.toISOString(),
        notes: schedule.notes,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Error creating payroll schedule:', error)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}

// PUT - Update existing payroll schedule
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, scheduledDate, notes } = await request.json()

    if (!id || !scheduledDate) {
      return NextResponse.json({ error: 'Schedule ID and scheduled date are required' }, { status: 400 })
    }

    // Update the schedule
    const schedule = await prisma.payrollSchedule.update({
      where: { payroll_schedule_id: id },
      data: {
        scheduledDate: new Date(scheduledDate),
        notes: notes || null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'Payroll schedule updated successfully',
      schedule: {
        id: schedule.payroll_schedule_id,
        scheduledDate: schedule.scheduledDate.toISOString(),
        notes: schedule.notes,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Error updating payroll schedule:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

// DELETE - Cancel payroll schedule
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Deactivate the schedule
    await prisma.payrollSchedule.update({
      where: { payroll_schedule_id: id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: 'Payroll schedule cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling payroll schedule:', error)
    return NextResponse.json({ error: 'Failed to cancel schedule' }, { status: 500 })
  }
}