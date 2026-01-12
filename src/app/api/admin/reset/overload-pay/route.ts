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

    // Delete all overload pay records
    const result = await prisma.overloadPay.deleteMany({})

    return NextResponse.json({ 
      success: true, 
      message: 'Overload pay reset successfully',
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error resetting overload pay:', error)
    return NextResponse.json(
      { error: 'Failed to reset overload pay' },
      { status: 500 }
    )
  }
}
