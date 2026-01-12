import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Attendance-related deduction types to exclude
    const attendanceRelatedTypes = ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Partial Attendance', 'Early Time-Out']

    // Delete all non-mandatory deductions (excluding attendance-related ones)
    const result = await prisma.deduction.deleteMany({
      where: {
        AND: [
          {
            deductionType: {
              isMandatory: false,
              name: {
                notIn: attendanceRelatedTypes
              }
            }
          }
        ]
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Other deductions reset successfully',
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error resetting other deductions:', error)
    return NextResponse.json(
      { error: 'Failed to reset other deductions' },
      { status: 500 }
    )
  }
}
