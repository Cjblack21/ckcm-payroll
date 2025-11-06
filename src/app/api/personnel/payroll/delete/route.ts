import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'PERSONNEL') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payrollIds } = await request.json()

    if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payroll IDs' }, { status: 400 })
    }

    // Delete payroll entries that belong to this user
    await prisma.payrollEntry.deleteMany({
      where: {
        payroll_entries_id: {
          in: payrollIds
        },
        users_id: session.user.id // Only allow deleting own payrolls
      }
    })

    return NextResponse.json({ 
      success: true,
      message: `Deleted ${payrollIds.length} payroll(s)` 
    })
  } catch (error) {
    console.error('Error deleting payrolls:', error)
    return NextResponse.json({ error: 'Failed to delete payrolls' }, { status: 500 })
  }
}
