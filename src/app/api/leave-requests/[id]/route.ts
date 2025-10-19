import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toPhilippinesDateString } from "@/lib/timezone"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get the leave request to check ownership
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { leave_requests_id: id }
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    // Only allow deletion if:
    // 1. User is ADMIN, OR
    // 2. User owns the leave request AND it's still PENDING
    const isAdmin = session.user.role === "ADMIN"
    const isOwner = leaveRequest.users_id === session.user.id
    const isPending = leaveRequest.status === "PENDING"

    if (!isAdmin && (!isOwner || !isPending)) {
      return NextResponse.json(
        { error: "You can only delete your own pending leave requests" },
        { status: 403 }
      )
    }

    // If leave was approved, clean up associated records
    if (leaveRequest.status === "APPROVED") {
      console.log(`🧹 Cleaning up approved leave records for leave ID: ${id}`)
      
      // Delete unpaid leave deductions if applicable
      if (!leaveRequest.isPaid) {
        await prisma.deduction.deleteMany({
          where: {
            users_id: leaveRequest.users_id,
            deductionType: {
              name: "Unpaid Leave"
            },
            notes: {
              contains: leaveRequest.leave_requests_id
            }
          }
        })
        console.log(`✅ Deleted unpaid leave deductions`)
      }
      
      // Delete attendance records created for this leave period
      // Generate all dates in the leave period
      const leaveDays: Date[] = []
      const currentDate = new Date(leaveRequest.startDate)
      const endDate = new Date(leaveRequest.endDate)
      
      while (currentDate <= endDate) {
        leaveDays.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Delete attendance records for leave dates (only if they have no time in/out)
      for (const leaveDate of leaveDays) {
        try {
          await prisma.attendance.deleteMany({
            where: {
              users_id: leaveRequest.users_id,
              date: leaveDate,
              timeIn: null, // Only delete records without actual punch-in (leave-generated records)
              timeOut: null
            }
          })
        } catch (err) {
          console.error(`Error deleting attendance for ${leaveDate}:`, err)
        }
      }
      console.log(`✅ Deleted attendance records for ${leaveDays.length} days`)
    }

    // Delete the leave request
    await prisma.leaveRequest.delete({
      where: { leave_requests_id: id }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Leave request deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting leave request:", error)
    return NextResponse.json(
      { error: "Failed to delete leave request" },
      { status: 500 }
    )
  }
}
