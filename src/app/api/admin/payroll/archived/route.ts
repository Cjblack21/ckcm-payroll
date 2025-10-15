import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get archived payroll entries
    const archivedPayrolls = await prisma.payrollEntry.findMany({
      where: {
        status: 'ARCHIVED'
      },
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      },
      orderBy: {
        archivedAt: 'desc'
      }
    })

    // Group by period for better organization
    const payrollsByPeriod = archivedPayrolls.reduce((acc, payroll) => {
      const periodKey = `${payroll.periodStart.toISOString().split('T')[0]}_${payroll.periodEnd.toISOString().split('T')[0]}`
      
      if (!acc[periodKey]) {
        acc[periodKey] = {
          periodStart: payroll.periodStart,
          periodEnd: payroll.periodEnd,
          archivedAt: payroll.archivedAt,
          payrolls: []
        }
      }
      
      acc[periodKey].payrolls.push(payroll)
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      archivedPayrolls: Object.values(payrollsByPeriod),
      totalCount: archivedPayrolls.length
    })

  } catch (error) {
    console.error('Error fetching archived payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch archived payrolls' },
      { status: 500 }
    )
  }
}











