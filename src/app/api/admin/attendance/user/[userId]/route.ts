import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DELETE - Delete all attendance records for a specific user
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { userId } = params

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { users_id: userId },
      select: { users_id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete all attendance records for this user
    const deleteResult = await prisma.attendance.deleteMany({
      where: { users_id: userId }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${deleteResult.count} attendance records for ${user.name || user.email}`,
      count: deleteResult.count
    })

  } catch (error) {
    console.error('Error deleting user attendance records:', error)
    return NextResponse.json(
      { error: 'Failed to delete attendance records' },
      { status: 500 }
    )
  }
}
