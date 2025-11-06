import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'PERSONNEL') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get additional pay for this user (not archived)
    const additionalPay = await prisma.overloadPay.findMany({
      where: {
        users_id: userId,
        archivedAt: null
      },
      select: {
        type: true,
        amount: true
      }
    })

    // Get deductions for this user
    const deductions = await prisma.deduction.findMany({
      where: {
        users_id: userId
      },
      include: {
        deductionType: {
          select: {
            name: true,
            isMandatory: true
          }
        }
      }
    })

    return NextResponse.json({
      additionalPay: additionalPay.map(ap => ({
        type: ap.type || 'OVERTIME',
        amount: Number(ap.amount)
      })),
      deductions: deductions.map(d => ({
        type: d.deductionType?.name || 'Deduction',
        amount: Number(d.amount),
        isMandatory: d.deductionType?.isMandatory || false
      }))
    })
  } catch (error) {
    console.error('Error fetching payroll details:', error)
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 })
  }
}
