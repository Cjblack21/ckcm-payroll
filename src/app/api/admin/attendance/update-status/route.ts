import { NextRequest, NextResponse } from 'next/server'
import { updateAllAttendanceStatusForDate } from '@/lib/actions/attendance'

export async function POST(request: NextRequest) {
  try {
    const { date, status } = await request.json()
    
    if (!date || !status) {
      return NextResponse.json(
        { success: false, error: 'Date and status are required' },
        { status: 400 }
      )
    }

    const result = await updateAllAttendanceStatusForDate(date, status)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Updated ${result.updatedCount} attendance records for ${date} to ${status}`,
        updatedCount: result.updatedCount
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in update attendance status API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

