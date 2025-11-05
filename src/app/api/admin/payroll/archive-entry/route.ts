import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, periodStart, periodEnd } = await request.json()

    if (!userId || !periodStart || !periodEnd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Archive the specific payroll entry
    const archiveResult = await prisma.payrollEntry.updateMany({
      where: {
        users_id: userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: 'RELEASED'
      },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date()
      }
    })

    if (archiveResult.count === 0) {
      return NextResponse.json({ 
        error: 'Payroll entry not found or already archived' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payroll entry archived successfully' 
    })

  } catch (error) {
    console.error('Error archiving payroll entry:', error)
    return NextResponse.json({ 
      error: 'Failed to archive payroll entry' 
    }, { status: 500 })
  }
}
