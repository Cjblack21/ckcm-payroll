import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DELETE - Delete an attendance record
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ attendanceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { attendanceId } = params

    // Check if the attendance record exists
    const existingRecord = await prisma.attendance.findUnique({
      where: { attendances_id: attendanceId }
    })

    if (!existingRecord) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    // Delete the attendance record
    await prisma.attendance.delete({
      where: { attendances_id: attendanceId }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Attendance record deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting attendance record:', error)
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    )
  }
}
