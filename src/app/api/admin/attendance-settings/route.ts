import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { parsePhilippinesLocalDate } from "@/lib/timezone"

const settingsSchema = z.object({
  timeInStart: z.string().optional().nullable(),
  timeInEnd: z.string().optional().nullable(),
  noTimeInCutoff: z.boolean().default(false),
  timeOutStart: z.string().optional().nullable(),
  timeOutEnd: z.string().optional().nullable(),
  noTimeOutCutoff: z.boolean().default(false),
  periodStart: z.string().optional().nullable().transform(val => val && val !== '' ? parsePhilippinesLocalDate(val) : undefined),
  periodEnd: z.string().optional().nullable().transform(val => val && val !== '' ? parsePhilippinesLocalDate(val, true) : undefined),
  payrollReleaseTime: z.string().optional().nullable(),
  autoMarkAbsent: z.boolean().default(true),
  autoMarkLate: z.boolean().default(true),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await prisma.attendanceSettings.findFirst()
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.attendanceSettings.create({
        data: {
          // Defaults per business rules: 7:00–9:00 time-in window, 17:00–19:00 time-out window
          timeInStart: '07:00',
          timeInEnd: '09:00',
          noTimeInCutoff: false,
          timeOutStart: '17:00',
          timeOutEnd: '19:00',
          noTimeOutCutoff: false,
          autoMarkAbsent: true,
          autoMarkLate: true
        }
      })
    }
    
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching attendance settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/admin/attendance-settings called')
    
    const session = await getServerSession(authOptions)
    console.log('🔐 Session check passed:', !!session, session?.user?.role)
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('❌ Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📥 Reading request body...')
    const body = await request.json()
    console.log('📥 Received settings data:', JSON.stringify(body, null, 2))
    
    console.log('🔍 Validating with Zod schema...')
    const validatedData = settingsSchema.parse(body)
    console.log('✅ Validated settings data:', JSON.stringify(validatedData, (key, value) => {
      return value instanceof Date ? value.toISOString() : value
    }, 2))

    console.log('💾 Querying existing settings...')
    // Get existing settings or create new ones
    let settings = await prisma.attendanceSettings.findFirst()
    console.log('📋 Existing settings found:', !!settings)
    
    // Prepare data for Prisma (remove undefined values)
    const prismaData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined)
    )
    
    console.log('💾 Saving to database:', JSON.stringify(prismaData, (key, value) => {
      return value instanceof Date ? value.toISOString() : value
    }, 2))
    
    if (settings) {
      console.log('🔄 Updating existing settings...')
      // Update existing settings
      settings = await prisma.attendanceSettings.update({
        where: { attendance_settings_id: settings.attendance_settings_id },
        data: prismaData
      })
      console.log('✅ Settings updated successfully')
    } else {
      console.log('🆕 Creating new settings...')
      // Create new settings with defaults
      settings = await prisma.attendanceSettings.create({
        data: {
          timeInStart: '07:00',
          timeInEnd: '09:00',
          noTimeInCutoff: false,
          timeOutStart: '17:00',
          timeOutEnd: '19:00',
          noTimeOutCutoff: false,
          autoMarkAbsent: true,
          autoMarkLate: true,
          ...prismaData
        }
      })
      console.log('✅ Settings created successfully')
    }

    // If period dates are set, create attendance records for the duration
    if (validatedData.periodStart && validatedData.periodEnd) {
      try {
        console.log('🔄 Creating attendance records for period...')
        await createAttendanceRecordsForPeriod(validatedData.periodStart, validatedData.periodEnd)
        console.log('✅ Attendance records created successfully')
      } catch (recordError) {
        console.error('❌ Error creating attendance records:', recordError)
        // Don't fail the entire settings save if record creation fails
        console.log('⚠️ Continuing with settings save despite record creation error')
      }
    }

    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Attendance settings updated successfully'
    })
  } catch (error) {
    console.error('❌ Error updating attendance settings:', error)
    
    if (error instanceof z.ZodError) {
      console.error('📝 Zod validation errors:', error.issues)
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: error.issues,
        message: 'Validation failed: ' + error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }, { status: 400 })
    }
    
    if (error instanceof Error) {
      console.error('💥 Error details:', error.message, error.stack)
      return NextResponse.json({ 
        error: 'Failed to update settings', 
        message: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to update settings', 
      message: 'Unknown error occurred' 
    }, { status: 500 })
  }
}

// Helper function to create attendance records for the specified period
async function createAttendanceRecordsForPeriod(periodStart: Date, periodEnd: Date) {
  try {
    // Get all active personnel
    const activePersonnel = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      select: { users_id: true }
    })

    if (activePersonnel.length === 0) {
      console.log('No active personnel found, skipping record creation')
      return
    }

    // Generate working days using Philippines timezone (exclude Sundays only)
    const workingDays = []
    const currentDate = new Date(periodStart)
    const endDate = new Date(periodEnd)

    while (currentDate <= endDate) {
      // Use Philippines timezone for day-of-week calculation
      const philippinesDate = new Date(currentDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      if (philippinesDate.getDay() !== 0) { // Exclude Sundays
        // Normalize date to start of day in UTC to ensure consistency with existing records
        const normalizedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0)
        workingDays.push(normalizedDate)
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(`Creating attendance records for ${workingDays.length} working days and ${activePersonnel.length} personnel`)

    // Create attendance records for each personnel and working day
    const recordsToCreate = []
    for (const person of activePersonnel) {
      for (const workingDay of workingDays) {
        recordsToCreate.push({
          users_id: person.users_id,
          date: workingDay,
          status: 'PENDING' as const
        })
      }
    }

    // Batch create records (use createMany with skipDuplicates to avoid conflicts)
    await prisma.attendance.createMany({
      data: recordsToCreate,
      skipDuplicates: true
    })

    console.log(`Successfully created ${recordsToCreate.length} attendance records`)
  } catch (error) {
    console.error('Error creating attendance records for period:', error)
    // Don't throw error here to avoid breaking the settings update
  }
}
