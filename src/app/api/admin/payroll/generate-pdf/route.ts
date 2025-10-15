import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { 
  calculateLateDeduction, 
  calculateAbsenceDeduction, 
  calculatePartialDeduction, 
  calculateEarnings 
} from "@/lib/attendance-calculations"
import { renderToStream } from '@react-pdf/renderer'
import { PayslipsDocument } from '@/lib/pdf-payslip-generator'

function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const currentDate = now.getDate()
  
  let periodStart: Date
  let periodEnd: Date
  
  if (currentDate <= 15) {
    // First half of month (1st to 15th)
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 15)
  } else {
    // Second half of month (16th to end of month)
    periodStart = new Date(now.getFullYear(), now.getMonth(), 16)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month
  }
  
  periodStart.setHours(0, 0, 0, 0)
  periodEnd.setHours(23, 59, 59, 999)
  
  return { periodStart, periodEnd }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodStart, periodEnd } = getCurrentBiweeklyPeriod()

    // Get users with their personnel type and basic salary
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      select: { 
        users_id: true, 
        name: true, 
        email: true,
        personnelType: {
          select: {
            basicSalary: true
          }
        }
      }
    })

    const userIds = users.map(u => u.users_id)

    // Get all attendance data for real-time calculation
    const attendance = await prisma.attendance.findMany({
      where: { 
        users_id: { in: userIds }, 
        date: { gte: periodStart, lte: periodEnd }
      },
      select: {
        users_id: true,
        timeIn: true,
        timeOut: true,
        status: true,
        date: true
      }
    })

    // Get non-attendance related deductions only
    const attendanceRelatedTypes = ['Late Arrival', 'Absence Deduction', 'Partial Attendance']
    const deductions = await prisma.deduction.findMany({
      where: {
        users_id: { in: userIds },
        deductionType: {
          name: { notIn: attendanceRelatedTypes }
        }
      },
      include: {
        deductionType: true
      }
    })

    // Get active loans
    const loans = await prisma.loan.findMany({
      where: {
        users_id: { in: userIds },
        status: 'ACTIVE'
      }
    })

    // Calculate real-time earnings and deductions
    const earningsMap = new Map<string, number>()
    const attendanceDeductionsMap = new Map<string, number>()
    const workHoursMap = new Map<string, number>()

    for (const record of attendance) {
      const user = users.find(u => u.users_id === record.users_id)
      if (!user?.personnelType?.basicSalary) continue

      const monthlySalary = Number(user.personnelType.basicSalary)
      const timeIn = new Date(record.timeIn)
      const timeOut = record.timeOut ? new Date(record.timeOut) : undefined

      if (record.status === 'PRESENT' && timeOut) {
        const earnings = calculateEarnings(monthlySalary, timeIn, timeOut)
        const workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        
        earningsMap.set(record.users_id, (earningsMap.get(record.users_id) || 0) + earnings)
        workHoursMap.set(record.users_id, (workHoursMap.get(record.users_id) || 0) + workHours)
      } else if (record.status === 'LATE' && timeOut) {
        const earnings = calculateEarnings(monthlySalary, timeIn, timeOut)
        const workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        // Get attendance settings for proper time calculation
        const attendanceSettings = await prisma.attendanceSettings.findFirst()
        const timeInEnd = attendanceSettings?.timeInEnd || '09:00' // Default to 9:00 AM if no settings
        const expectedTimeIn = new Date(record.date)
        const [hours, minutes] = timeInEnd.split(':').map(Number)
        expectedTimeIn.setHours(hours, minutes, 0, 0)
        const lateDeduction = calculateLateDeduction(monthlySalary, timeIn, expectedTimeIn)
        
        earningsMap.set(record.users_id, (earningsMap.get(record.users_id) || 0) + earnings)
        workHoursMap.set(record.users_id, (workHoursMap.get(record.users_id) || 0) + workHours)
        attendanceDeductionsMap.set(record.users_id, (attendanceDeductionsMap.get(record.users_id) || 0) + lateDeduction)
      } else if (record.status === 'ABSENT') {
        const absenceDeduction = calculateAbsenceDeduction(monthlySalary)
        attendanceDeductionsMap.set(record.users_id, (attendanceDeductionsMap.get(record.users_id) || 0) + absenceDeduction)
      } else if (record.status === 'PARTIAL' && timeOut) {
        const workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        const partialDeduction = calculatePartialDeduction(monthlySalary, workHours)
        
        earningsMap.set(record.users_id, (earningsMap.get(record.users_id) || 0) + (workHours * (monthlySalary / 30 / 8)))
        workHoursMap.set(record.users_id, (workHoursMap.get(record.users_id) || 0) + workHours)
        attendanceDeductionsMap.set(record.users_id, (attendanceDeductionsMap.get(record.users_id) || 0) + partialDeduction)
      }
    }

    // Calculate non-attendance deductions
    const deductionsMap = new Map<string, { total: number, details: any[] }>()
    for (const deduction of deductions) {
      const current = deductionsMap.get(deduction.users_id) || { total: 0, details: [] }
      current.total += Number(deduction.amount)
      current.details.push({
        id: deduction.deductions_id,
        amount: Number(deduction.amount),
        type: deduction.deductionType.name
      })
      deductionsMap.set(deduction.users_id, current)
    }

    // Calculate loan payments
    const loanPaymentsMap = new Map<string, number>()
    for (const loan of loans) {
      const loanAmount = Number(loan.amount)
      const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
      const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
      const biweeklyPayment = monthlyPayment / 2
      
      loanPaymentsMap.set(loan.users_id, (loanPaymentsMap.get(loan.users_id) || 0) + biweeklyPayment)
    }

    // Prepare payslip data
    const payslipData = users.map(u => {
      const basicSalary = u.personnelType?.basicSalary ? Number(u.personnelType.basicSalary) : 0
      const biweeklyBasicSalary = basicSalary / 2
      const deductionData = deductionsMap.get(u.users_id) || { total: 0, details: [] }
      const nonAttendanceDeductions = deductionData.total
      const attendanceDeductions = attendanceDeductionsMap.get(u.users_id) || 0
      const realTimeEarnings = earningsMap.get(u.users_id) || 0
      const realWorkHours = workHoursMap.get(u.users_id) || 0
      const loanPayments = loanPaymentsMap.get(u.users_id) || 0
      
      const overtimePay = Math.max(0, realTimeEarnings - biweeklyBasicSalary)
      const totalDeductions = attendanceDeductions + nonAttendanceDeductions + loanPayments
      const grossPay = biweeklyBasicSalary + overtimePay
      const netPay = Math.max(0, grossPay - totalDeductions)

      return {
        users_id: u.users_id,
        name: u.name,
        email: u.email,
        totalHours: realWorkHours,
        totalSalary: netPay,
        released: false,
        breakdown: {
          biweeklyBasicSalary,
          realTimeEarnings,
          realWorkHours,
          overtimePay,
          attendanceDeductions,
          nonAttendanceDeductions,
          loanPayments,
          grossPay,
          totalDeductions,
          netPay,
          deductionDetails: deductionData.details
        }
      }
    })

    // Get header settings
    const headerSettings = await prisma.headerSettings.findFirst()

    // Generate PDF
    const pdfStream = await renderToStream(
      PayslipsDocument({
        employees: payslipData,
        period: { 
          periodStart: periodStart.toISOString(), 
          periodEnd: periodEnd.toISOString() 
        },
        headerSettings
      })
    )

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslips-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating PDF payslips:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF payslips' },
      { status: 500 }
    )
  }
}










