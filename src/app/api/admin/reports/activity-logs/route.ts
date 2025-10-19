import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereClause: any = {}
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    const formattedLogs = logs.map(log => ({
      activity_logs_id: log.activity_logs_id,
      users_id: log.users_id,
      userName: log.user.name,
      userEmail: log.user.email,
      userRole: log.user.role,
      action: log.action,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString()
    }))

    return NextResponse.json({ logs: formattedLogs })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch activity logs',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
