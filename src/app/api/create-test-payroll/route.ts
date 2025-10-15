import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('Creating test payroll data...')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.users_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.users_id
    console.log('Creating payroll for user:', userId)

    // Get current biweekly period
    const { periodStart, periodEnd } = getCurrentBiweeklyPeriod()
    
    // Check if user has personnel type
    const user = await prisma.user.findUnique({
      where: { users_id: userId },
      include: { personnelType: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.personnelType) {
      return NextResponse.json({ error: 'User has no personnel type assigned' }, { status: 400 })
    }

    // Check if payroll already exists
    const existingPayroll = await prisma.payrollEntry.findFirst({
      where: {
        users_id: userId,
        processedAt: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    })

    if (existingPayroll) {
      return NextResponse.json({ 
        message: 'Payroll already exists for this period',
        payroll: existingPayroll
      })
    }

    // Create test payroll entry
    const basicSalary = Number(user.personnelType.basicSalary)
    const biweeklyBasicSalary = basicSalary / 2
    const overtime = 0
    const deductions = 0
    const netPay = biweeklyBasicSalary

    const payroll = await prisma.payrollEntry.create({
      data: {
        users_id: userId,
        periodStart: periodStart,
        periodEnd: periodEnd,
        basicSalary: biweeklyBasicSalary,
        overtime: overtime,
        deductions: deductions,
        netPay: netPay,
        status: 'PENDING',
        processedAt: new Date()
      }
    })

    console.log('Created payroll entry:', payroll)

    return NextResponse.json({
      message: 'Test payroll created successfully',
      payroll: payroll,
      period: { periodStart, periodEnd },
      user: {
        name: user.name,
        email: user.email,
        personnelType: user.personnelType.name
      }
    })

  } catch (error) {
    console.error('Error creating test payroll:', error)
    return NextResponse.json({
      error: 'Failed to create test payroll',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Function to get current biweekly period
function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  
  // Find the first Monday of the year
  const firstMonday = new Date(year, 0, 1)
  const dayOfWeek = firstMonday.getDay()
  const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  firstMonday.setDate(firstMonday.getDate() + daysToAdd)
  
  // Calculate which biweekly period we're in
  const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
  const biweeklyPeriod = Math.floor(daysSinceFirstMonday / 14)
  
  // Calculate start and end of current biweekly period
  const periodStart = new Date(firstMonday)
  periodStart.setDate(periodStart.getDate() + (biweeklyPeriod * 14))
  
  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 13)
  periodEnd.setHours(23, 59, 59, 999)
  
  return { periodStart, periodEnd }
}











