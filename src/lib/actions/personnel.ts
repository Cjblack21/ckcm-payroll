'use server'

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculateLateDeductionSync, calculateAbsenceDeductionSync, calculatePartialDeduction } from "@/lib/attendance-calculations-sync"
import { revalidatePath } from "next/cache"

// Types
export type PersonnelType = {
  personnel_types_id: string
  name: string
  type?: string | null
  department?: string | null
  basicSalary: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type PersonnelDashboard = {
  currentPeriod: {
    start: Date
    end: Date
  }
  nextPeriod: {
    start: Date
    end: Date
  }
  monthlyAttendance: number
  totalEarnings: number
  totalDeductions: number
  netPay: number
  payrollStatus: string | null
  nextPayoutDate: Date
  activeLoans: Array<{
    loans_id: string
    amount: number
    balance: number
    monthlyPaymentPercent: number
    termMonths: number
  }>
}

// Server Action: Get personnel dashboard data
export async function getPersonnelDashboard(): Promise<{
  success: boolean
  dashboard?: PersonnelDashboard
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'PERSONNEL') {
      return { success: false, error: 'Unauthorized' }
    }

    const userId = session.user.id

    // Get current biweekly period
    const now = new Date()
    const currentDay = now.getDate()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), currentDay <= 15 ? 1 : 16)
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), currentDay <= 15 ? 15 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
    periodEnd.setHours(23, 59, 59, 999)

    // Get next biweekly period
    const nextPeriodStart = new Date(periodEnd)
    nextPeriodStart.setDate(nextPeriodStart.getDate() + 1)
    nextPeriodStart.setHours(0, 0, 0, 0)
    
    const nextPeriodEnd = new Date(nextPeriodStart)
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() + (nextPeriodStart.getDate() <= 15 ? 14 : 15))
    nextPeriodEnd.setHours(23, 59, 59, 999)

    // Get user with personnel type
    const user = await prisma.user.findUnique({
      where: { users_id: userId },
      include: {
        personnelType: true
      }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Get monthly attendance for current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    monthEnd.setHours(23, 59, 59, 999)

    const monthlyAttendance = await prisma.attendance.findMany({
      where: {
        users_id: userId,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    })

    // Get current period payroll status
    const currentPayroll = await prisma.payrollEntry.findFirst({
      where: {
        users_id: userId,
        processedAt: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      orderBy: {
        processedAt: 'desc'
      }
    })

    // Get non-attendance related deductions only (attendance deductions calculated real-time)
    const deductions = await prisma.deduction.findMany({
      where: {
        users_id: userId,
        appliedAt: {
          gte: periodStart,
          lte: periodEnd
        },
        deductionType: {
          name: {
            notIn: ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Early Time-Out', 'Partial Attendance']
          }
        }
      },
      include: {
        deductionType: {
          select: {
            name: true,
            amount: true
          }
        }
      }
    })

    // Get active loans
    const activeLoans = await prisma.loan.findMany({
      where: {
        users_id: userId,
        status: 'ACTIVE'
      }
    })

    // Calculate loan payments (biweekly - consistent with payroll release logic)
    const loanPayments = activeLoans.reduce((total, loan) => {
      const loanAmount = Number(loan.amount)
      const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
      const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
      const biweeklyPayment = monthlyPayment / 2 // Convert to biweekly payment
      return total + biweeklyPayment
    }, 0)

    // Get attendance settings for deduction calculations
    const attendanceSettings = await prisma.attendanceSettings.findFirst()
    const timeInEnd = attendanceSettings?.timeInEnd || '09:00'

    // Calculate real-time attendance deductions from attendance records
    const workingDaysInPeriod = 22 // Default fallback
    const attendanceDeductions = monthlyAttendance.reduce((total, attendance) => {
      let dayDeductions = 0
      
      if (attendance.status === 'LATE' && attendance.timeIn) {
        // Calculate late deduction
        const timeIn = new Date(attendance.timeIn)
        const expectedTimeIn = new Date(attendance.date)
        const [hours, minutes] = timeInEnd.split(':').map(Number)
        expectedTimeIn.setHours(hours, minutes, 0, 0)
        dayDeductions = calculateLateDeductionSync(Number(user.personnelType?.basicSalary || 0), timeIn, expectedTimeIn, workingDaysInPeriod)
      } else if (attendance.status === 'ABSENT') {
        // Calculate absence deduction
        dayDeductions = calculateAbsenceDeductionSync(Number(user.personnelType?.basicSalary || 0), workingDaysInPeriod)
      } else if (attendance.status === 'PARTIAL' && attendance.timeIn) {
        // Calculate partial deduction
        const timeIn = new Date(attendance.timeIn)
        const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : undefined
        const workHours = timeOut ? (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60) : 0
        dayDeductions = calculatePartialDeduction(Number(user.personnelType?.basicSalary || 0), workHours, 8, workingDaysInPeriod)
      }
      
      return total + dayDeductions
    }, 0)

    // Calculate total deductions (non-attendance + attendance real-time + loans)
    const nonAttendanceDeductions = deductions.reduce((total, deduction) => {
      return total + Number(deduction.amount)
    }, 0)
    const totalDeductions = nonAttendanceDeductions + attendanceDeductions + loanPayments

    // Calculate biweekly salary
    const basicSalary = user.personnelType?.basicSalary ? Number(user.personnelType.basicSalary) : 0
    const biweeklySalary = basicSalary / 2

    // Calculate net pay
    const netPay = Math.max(0, biweeklySalary - totalDeductions)

    // Calculate total earnings from attendance
    const totalEarnings = monthlyAttendance.reduce((total, attendance) => {
      if (attendance.timeIn) {
        const timeIn = new Date(attendance.timeIn)
        const timeOut = attendance.timeOut ? new Date(attendance.timeOut) : new Date()
        const workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        const hourlyRate = (basicSalary / 22 / 8) // Daily rate / 8 hours
        return total + (workHours * hourlyRate)
      }
      return total
    }, 0)

    const dashboard: PersonnelDashboard = {
      currentPeriod: {
        start: periodStart,
        end: periodEnd
      },
      nextPeriod: {
        start: nextPeriodStart,
        end: nextPeriodEnd
      },
      monthlyAttendance: monthlyAttendance.length,
      totalEarnings,
      totalDeductions,
      netPay,
      payrollStatus: currentPayroll?.status || null,
      nextPayoutDate: nextPeriodEnd,
      activeLoans: activeLoans.map(loan => ({
        loans_id: loan.loans_id,
        amount: Number(loan.amount),
        balance: Number(loan.balance),
        monthlyPaymentPercent: Number(loan.monthlyPaymentPercent),
        termMonths: loan.termMonths
      }))
    }

    return { success: true, dashboard }
  } catch (error) {
    console.error('Error in getPersonnelDashboard:', error)
    return { success: false, error: 'Failed to fetch personnel dashboard' }
  }
}

// Server Action: Get all personnel types
export async function getPersonnelTypes(): Promise<{
  success: boolean
  personnelTypes?: PersonnelType[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const personnelTypes = await prisma.personnelType.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Convert Decimal to number for serialization
    const serializedPersonnelTypes = personnelTypes.map(type => ({
      ...type,
      basicSalary: Number(type.basicSalary)
    }))

    return { success: true, personnelTypes: serializedPersonnelTypes }
  } catch (error) {
    console.error('Error in getPersonnelTypes:', error)
    return { success: false, error: 'Failed to fetch personnel types' }
  }
}

// Server Action: Create personnel type
export async function createPersonnelType(data: {
  name: string
  type?: string
  department?: string
  basicSalary: number
  isActive?: boolean
}): Promise<{
  success: boolean
  personnelType?: PersonnelType
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const personnelType = await prisma.personnelType.create({
      data: {
        name: data.name,
        type: data.type,
        department: data.department,
        basicSalary: data.basicSalary,
        isActive: data.isActive ?? true
      }
    })

    // Convert Decimal to number for serialization
    const serializedPersonnelType = {
      ...personnelType,
      basicSalary: Number(personnelType.basicSalary)
    }

    revalidatePath('/admin/personnel-types')
    return { success: true, personnelType: serializedPersonnelType }
  } catch (error) {
    console.error('Error in createPersonnelType:', error)
    
    // Handle duplicate name error
    if (error instanceof Error && error.message.includes('Unique constraint failed') && error.message.includes('personnel_types_name_key')) {
      return { success: false, error: `A position named "${data.name}" already exists. Please use a different name.` }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create personnel type'
    return { success: false, error: errorMessage }
  }
}

// Server Action: Update personnel type
export async function updatePersonnelType(
  personnelTypesId: string,
  data: {
    name?: string
    type?: string
    department?: string
    basicSalary?: number
    isActive?: boolean
  }
): Promise<{
  success: boolean
  personnelType?: PersonnelType
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const personnelType = await prisma.personnelType.update({
      where: { personnel_types_id: personnelTypesId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.basicSalary !== undefined && { basicSalary: data.basicSalary }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    })

    // Convert Decimal to number for serialization
    const serializedPersonnelType = {
      ...personnelType,
      basicSalary: Number(personnelType.basicSalary)
    }

    revalidatePath('/admin/personnel-types')
    return { success: true, personnelType: serializedPersonnelType }
  } catch (error) {
    console.error('Error in updatePersonnelType:', error)
    return { success: false, error: 'Failed to update personnel type' }
  }
}

// Server Action: Delete personnel type
export async function deletePersonnelType(personnelTypesId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if personnel type is being used by any users
    const usersCount = await prisma.user.count({
      where: {
        personnel_types_id: personnelTypesId
      }
    })

    if (usersCount > 0) {
      return { success: false, error: 'Cannot delete personnel type that is assigned to users' }
    }

    await prisma.personnelType.delete({
      where: { personnel_types_id: personnelTypesId }
    })

    revalidatePath('/admin/personnel-types')
    return { success: true }
  } catch (error) {
    console.error('Error in deletePersonnelType:', error)
    return { success: false, error: 'Failed to delete personnel type' }
  }
}
