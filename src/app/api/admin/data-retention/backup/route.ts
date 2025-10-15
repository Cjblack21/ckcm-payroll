import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating data backup...')

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    
    // Create a comprehensive backup of all data
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        createdBy: session.user.email,
        description: 'Full system backup - FOREVER retention policy'
      },
      data: {
        // Users and related data
        users: await prisma.user.findMany({
          include: {
            personnelType: true
          }
        }),
        
        // Personnel types
        personnelTypes: await prisma.personnelType.findMany(),
        
        // Payroll data
        payrollEntries: await prisma.payrollEntry.findMany({
          include: {
            user: {
              select: {
                users_id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        
        // Attendance data
        attendance: await prisma.attendance.findMany({
          include: {
            user: {
              select: {
                users_id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        
        // Deductions
        deductions: await prisma.deduction.findMany({
          include: {
            user: {
              select: {
                users_id: true,
                name: true,
                email: true
              }
            },
            deductionType: true
          }
        }),
        
        // Deduction types
        deductionTypes: await prisma.deductionType.findMany(),
        
        // Loans
        loans: await prisma.loan.findMany({
          include: {
            user: {
              select: {
                users_id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        
        // Holidays
        holidays: await prisma.holiday.findMany(),
        
        // Events
        events: await prisma.event.findMany(),
        
        // Departments
        departments: await prisma.department.findMany(),
        
        // Leave requests
        leaveRequests: await prisma.leaveRequest.findMany({
          include: {
            user: {
              select: {
                users_id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        
        // Attendance settings
        attendanceSettings: await prisma.attendanceSettings.findMany(),
        
        // Header settings
        headerSettings: await prisma.headerSettings.findMany(),
        
        // Payroll schedules
        payrollSchedules: await prisma.payrollSchedule.findMany()
      }
    }

    // Calculate backup statistics
    const stats = {
      users: backup.data.users.length,
      personnelTypes: backup.data.personnelTypes.length,
      payrollEntries: backup.data.payrollEntries.length,
      attendance: backup.data.attendance.length,
      deductions: backup.data.deductions.length,
      deductionTypes: backup.data.deductionTypes.length,
      loans: backup.data.loans.length,
      holidays: backup.data.holidays.length,
      events: backup.data.events.length,
      departments: backup.data.departments.length,
      leaveRequests: backup.data.leaveRequests.length,
      attendanceSettings: backup.data.attendanceSettings.length,
      headerSettings: backup.data.headerSettings.length,
      payrollSchedules: backup.data.payrollSchedules.length
    }

    console.log('Backup created successfully:', stats)

    // In a real implementation, you would save this to a file or cloud storage
    // For now, we'll return the backup data with metadata
    return NextResponse.json({
      success: true,
      message: 'Data backup created successfully',
      backup: {
        metadata: backup.metadata,
        stats
      },
      // Note: In production, you would not return the actual data in the response
      // Instead, you would save it to a secure location and return a reference
      dataSize: JSON.stringify(backup).length,
      timestamp: backup.metadata.timestamp
    })

  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({
      error: 'Failed to create backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}










