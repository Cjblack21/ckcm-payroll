import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { payrollId } = await request.json()

    if (!payrollId) {
      return NextResponse.json({ error: 'Payroll ID is required' }, { status: 400 })
    }

    // Verify the payroll belongs to this user and is RELEASED
    const payroll = await prisma.payrollEntry.findFirst({
      where: {
        payroll_entries_id: payrollId,
        users_id: userId,
        status: 'RELEASED'
      }
    })

    if (!payroll) {
      return NextResponse.json({ 
        error: 'Payroll not found or cannot be archived. Only released payrolls can be archived.' 
      }, { status: 404 })
    }

    // Archive the payroll entry
    const now = new Date()
    await prisma.payrollEntry.update({
      where: {
        payroll_entries_id: payrollId
      },
      data: {
        status: 'ARCHIVED',
        archivedAt: now
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Payroll archived successfully' 
    })

  } catch (error) {
    console.error('Error archiving payroll:', error)
    return NextResponse.json({ 
      error: 'Failed to archive payroll',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
