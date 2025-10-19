import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPhilippinesDayOfWeek, generateWorkingDaysInPhilippines, toPhilippinesDateString, toZonedTime } from "@/lib/timezone"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { action, comment } = body || {}

    if (!id || !action || !["APPROVE", "DENY"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const status = action === "APPROVE" ? "APPROVED" : "DENIED"

    // Get leave request details before updating
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { leave_requests_id: id },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    const updated = await prisma.leaveRequest.update({
      where: { leave_requests_id: id },
      data: {
        status,
        admin_id: session.user.id,
        adminComment: typeof comment === "string" ? comment : null,
      },
    })

    // If approving leave, automatically create attendance records
    if (action === "APPROVE") {
      console.log(`🏖️ Creating attendance records for approved leave: ${leaveRequest.leave_requests_id}`)
      
      // Generate all days in the leave period (including weekends)
      const leaveDays: string[] = []
      const currentDate = new Date(leaveRequest.startDate)
      const endDate = new Date(leaveRequest.endDate)
      
      while (currentDate <= endDate) {
        const dateString = toPhilippinesDateString(currentDate)
        leaveDays.push(dateString)
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      console.log(`📅 Leave period covers ${leaveDays.length} days: ${leaveDays[0]} to ${leaveDays[leaveDays.length - 1]}`)
      
      // Create attendance records for all leave days
      for (const dateString of leaveDays) {
        const leaveDate = new Date(dateString + 'T00:00:00.000Z')
        
        try {
          // Check if attendance record already exists
          const existingAttendance = await prisma.attendance.findUnique({
            where: {
              users_id_date: {
                users_id: leaveRequest.users_id,
                date: leaveDate
              }
            }
          })
          
          if (!existingAttendance) {
            // Create new attendance record marked as ON_LEAVE
            await prisma.attendance.create({
              data: {
                users_id: leaveRequest.users_id,
                date: leaveDate,
                status: "ON_LEAVE", // Mark as on leave - no time in/out allowed
                timeIn: null, // No actual time in/out for leave days
                timeOut: null
              }
            })
            console.log(`✅ Created attendance record for ${dateString} - Status: ON_LEAVE`)
          } else {
            // Update existing record to ON_LEAVE if it was marked differently
            if (existingAttendance.status !== "ON_LEAVE") {
              await prisma.attendance.update({
                where: {
                  attendances_id: existingAttendance.attendances_id
                },
                data: {
                  status: "ON_LEAVE" // Update to on leave since leave is now approved
                }
              })
              console.log(`📝 Updated existing attendance record for ${dateString} - Status: ON_LEAVE`)
            }
          }
        } catch (attendanceError) {
          console.error(`❌ Error creating attendance record for ${dateString}:`, attendanceError)
          // Continue with other dates even if one fails
        }
      }
      
      // If UNPAID leave, also create deduction
      if (!leaveRequest.isPaid) {
        console.log(`💰 Processing unpaid leave deduction...`)
        
        // Get or create "Unpaid Leave" deduction type
        let deductionType = await prisma.deductionType.findFirst({
          where: { name: "Unpaid Leave" }
        })

        if (!deductionType) {
          deductionType = await prisma.deductionType.create({
            data: {
              name: "Unpaid Leave",
              description: "Automatic deduction for approved unpaid leave",
              amount: 0, // Amount varies per employee
              isActive: true
            }
          })
        }

        // Calculate working days in leave period (exclude Sundays)
        const workingDays = generateWorkingDaysInPhilippines(leaveRequest.startDate, leaveRequest.endDate).length

        // Calculate deduction amount
        const basicSalary = leaveRequest.user.personnelType?.basicSalary 
          ? Number(leaveRequest.user.personnelType.basicSalary) 
          : 0
        
        if (basicSalary > 0 && workingDays > 0) {
          // Get attendance settings to calculate working days in period
          const attendanceSettings = await prisma.attendanceSettings.findFirst()
          const workingDaysInPeriod = attendanceSettings ? 22 : 22 // Default to 22 if no settings
          
          const dailySalary = basicSalary / workingDaysInPeriod
          const deductionAmount = dailySalary * workingDays

          // Create deduction record
          await prisma.deduction.create({
            data: {
              users_id: leaveRequest.users_id,
              deduction_types_id: deductionType.deduction_types_id,
              amount: deductionAmount,
              appliedAt: new Date(),
              notes: `Unpaid leave: ${leaveRequest.startDate.toISOString().split('T')[0]} to ${leaveRequest.endDate.toISOString().split('T')[0]} (${workingDays} working days) - Leave ID: ${leaveRequest.leave_requests_id}`
            }
          })

          console.log(`✅ Auto-created unpaid leave deduction: ₱${deductionAmount.toFixed(2)} for ${workingDays} working days`)
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating leave request:", error)
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 })
  }
}
