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

    // Delete all loan records
    const result = await prisma.loan.deleteMany({})

    return NextResponse.json({ 
      success: true, 
      message: 'Loans reset successfully',
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error resetting loans:', error)
    return NextResponse.json(
      { error: 'Failed to reset loans' },
      { status: 500 }
    )
  }
}
