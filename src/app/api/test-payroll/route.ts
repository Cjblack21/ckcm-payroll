import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Test payroll API called')
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No session or user ID' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('User ID:', userId)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { users_id: userId },
      include: {
        personnelType: true
      }
    })
    console.log('User found:', user ? 'Yes' : 'No')
    if (user) {
      console.log('User details:', {
        name: user.name,
        email: user.email,
        role: user.role,
        hasPersonnelType: !!user.personnelType
      })
    }

    // Check all payroll entries
    const allPayrolls = await prisma.payrollEntry.findMany({
      take: 5,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    console.log('Total payroll entries found:', allPayrolls.length)
    console.log('Sample payroll entries:', allPayrolls)

    // Check user's payroll entries
    const userPayrolls = await prisma.payrollEntry.findMany({
      where: { users_id: userId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    console.log('User payroll entries:', userPayrolls.length)

    return NextResponse.json({
      session: {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        userId: session?.user?.id
      },
      user: user ? {
        name: user.name,
        email: user.email,
        role: user.role,
        hasPersonnelType: !!user.personnelType
      } : null,
      payrollStats: {
        totalPayrolls: allPayrolls.length,
        userPayrolls: userPayrolls.length
      },
      samplePayrolls: allPayrolls,
      userPayrolls: userPayrolls
    })

  } catch (error) {
    console.error('Test payroll error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}











