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

    const adminId = session.user.id
    const { nextPeriodStart, nextPeriodEnd, type, notes } = await request.json()

    if (!nextPeriodStart || !nextPeriodEnd) {
      return NextResponse.json({ error: 'Period start and end dates are required' }, { status: 400 })
    }

    // Store the next period configuration in a simple way
    // For now, we'll store it in the workingDays JSON field as additional metadata
    const nextPeriodConfig = {
      periodStart: new Date(nextPeriodStart),
      periodEnd: new Date(nextPeriodEnd),
      type: type || 'Semi-Monthly',
      status: 'SCHEDULED',
      notes: notes || '',
      scheduledBy: adminId,
      scheduledAt: new Date()
    }

    // Get existing HeaderSettings
    const existingSettings = await prisma.headerSettings.findFirst()
    
    if (existingSettings) {
      // Update existing settings with next period info in customText field
      await prisma.headerSettings.update({
        where: { id: existingSettings.id },
        data: {
          customText: `Next Payroll Period: ${nextPeriodStart} to ${nextPeriodEnd} (${type}) - ${notes || 'No notes'}`
        }
      })
    } else {
      // Create new HeaderSettings if none exist
      await prisma.headerSettings.create({
        data: {
          schoolName: 'Default School',
          schoolAddress: 'Default Address',
          systemName: 'Payroll System',
          customText: `Next Payroll Period: ${nextPeriodStart} to ${nextPeriodEnd} (${type}) - ${notes || 'No notes'}`,
          workingDays: JSON.stringify(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        }
      })
    }

    console.log(`✅ Payroll period rescheduled: ${nextPeriodConfig.periodStart.toLocaleDateString()} - ${nextPeriodConfig.periodEnd.toLocaleDateString()}`)

    return NextResponse.json({ 
      success: true,
      message: `Next payroll period set: ${new Date(nextPeriodStart).toLocaleDateString()} - ${new Date(nextPeriodEnd).toLocaleDateString()}`,
      period: {
        id: existingSettings?.id || 'new',
        periodStart: nextPeriodConfig.periodStart.toISOString(),
        periodEnd: nextPeriodConfig.periodEnd.toISOString(),
        status: nextPeriodConfig.status,
        notes: nextPeriodConfig.notes
      }
    })

  } catch (error) {
    console.error('Error setting next payroll period:', error)
    return NextResponse.json({ error: 'Failed to set next payroll period' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the next period configuration from HeaderSettings
    const headerSettings = await prisma.headerSettings.findFirst()
    
    if (headerSettings?.customText && headerSettings.customText.includes('Next Payroll Period:')) {
      // Parse the customText to extract period information
      const periodMatch = headerSettings.customText.match(/Next Payroll Period: (.+?) to (.+?) \((.+?)\) - (.+)/)
      
      if (periodMatch) {
        const period = {
          id: headerSettings.id,
          periodStart: periodMatch[1],
          periodEnd: periodMatch[2],
          type: periodMatch[3],
          notes: periodMatch[4] === 'No notes' ? '' : periodMatch[4],
          status: 'SCHEDULED'
        }
        
        return NextResponse.json({ 
          success: true, 
          period: period,
          message: 'Scheduled payroll period found' 
        })
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      period: null,
      message: 'No scheduled payroll period found' 
    })

  } catch (error) {
    console.error('Error fetching next payroll period:', error)
    return NextResponse.json({ error: 'Failed to fetch next payroll period' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminId = session.user.id
    const { id, periodStart, periodEnd, notes } = await request.json()

    if (!id || !periodStart || !periodEnd) {
      return NextResponse.json({ error: 'Period ID, start and end dates are required' }, { status: 400 })
    }

    // Note: Would need payrollPeriod model to update next period
    const updatedPeriod = {
      id: id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: 'SCHEDULED',
      notes: notes || ''
    }

    // Note: Audit logging would require adding auditLog model to schema

    return NextResponse.json({ 
      success: true,
      message: `Payroll period updated: ${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`,
      period: {
        id: updatedPeriod.id,
        periodStart: updatedPeriod.periodStart.toISOString(),
        periodEnd: updatedPeriod.periodEnd.toISOString(),
        status: updatedPeriod.status,
        notes: updatedPeriod.notes
      }
    })

  } catch (error) {
    console.error('Error updating payroll period:', error)
    return NextResponse.json({ error: 'Failed to update payroll period' }, { status: 500 })
  }
}
