import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToStream } from '@react-pdf/renderer'
import { PayslipsDocument } from '@/lib/pdf-payslip-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { periodStart, periodEnd } = body

    console.log('📥 Received request to generate PDF for archived period:', periodStart, 'to', periodEnd)

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: 'Missing period dates' }, { status: 400 })
    }

    // Parse dates carefully - they come as YYYY-MM-DD strings
    const periodStartDate = new Date(periodStart + 'T00:00:00.000Z')
    const periodEndDate = new Date(periodEnd + 'T23:59:59.999Z')

    console.log('📅 Searching for entries with exact period:', periodStartDate, 'to', periodEndDate)

    // Get archived payroll entries for this period (can be RELEASED or ARCHIVED status)
    const archivedEntries = await prisma.payrollEntry.findMany({
      where: {
        periodStart: {
          gte: new Date(periodStart + 'T00:00:00.000Z'),
          lte: new Date(periodStart + 'T23:59:59.999Z')
        },
        periodEnd: {
          gte: new Date(periodEnd + 'T00:00:00.000Z'),
          lte: new Date(periodEnd + 'T23:59:59.999Z')
        },
        status: {
          in: ['RELEASED', 'ARCHIVED']
        }
      },
      include: {
        user: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnelType: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      }
    })

    console.log(`✅ Found ${archivedEntries.length} archived entries`)

    if (archivedEntries.length === 0) {
      console.error('❌ No archived payroll entries found')
      return NextResponse.json({ 
        error: 'No archived payroll found for this period',
        details: `Searched for entries between ${periodStart} and ${periodEnd} with status RELEASED or ARCHIVED`
      }, { status: 404 })
    }

    // Get the actual attendance data for this period to show real work hours
    const userIds = archivedEntries.map(e => e.users_id)
    const attendance = await prisma.attendance.findMany({
      where: {
        users_id: { in: userIds },
        date: {
          gte: periodStartDate,
          lte: periodEndDate
        }
      },
      select: {
        users_id: true,
        timeIn: true,
        timeOut: true,
        status: true
      }
    })

    // Calculate work hours by user
    const workHoursMap = new Map<string, number>()
    for (const record of attendance) {
      if (record.timeIn && record.timeOut) {
        const hours = (new Date(record.timeOut).getTime() - new Date(record.timeIn).getTime()) / (1000 * 60 * 60)
        workHoursMap.set(record.users_id, (workHoursMap.get(record.users_id) || 0) + hours)
      }
    }

    // Transform archived entries with REAL data from the database
    const payslipData = archivedEntries.map(entry => {
      const basicSalary = Number(entry.basicSalary)
      const overtime = Number(entry.overtime || 0)
      const deductions = Number(entry.deductions)
      const netPay = Number(entry.netPay)
      const workHours = workHoursMap.get(entry.users_id) || 0
      const grossPay = basicSalary + overtime

      return {
        users_id: entry.users_id,
        name: entry.user?.name || 'Unknown',
        email: entry.user?.email || '',
        totalHours: workHours,
        totalSalary: netPay,
        released: true,
        breakdown: {
          biweeklyBasicSalary: basicSalary,
          realTimeEarnings: basicSalary,
          realWorkHours: workHours,
          overtimePay: overtime,
          attendanceDeductions: 0, // Included in total deductions
          nonAttendanceDeductions: deductions,
          loanPayments: 0, // Included in total deductions
          grossPay: grossPay,
          totalDeductions: deductions,
          netPay: netPay,
          deductionDetails: []
        }
      }
    })

    console.log('📄 Prepared payslip data with real values for', payslipData.length, 'employees')

    // Get header settings
    const headerSettings = await prisma.headerSettings.findFirst()

    // Generate PDF
    const pdfStream = await renderToStream(
      <PayslipsDocument
        employees={payslipData}
        period={{ 
          periodStart: periodStartDate.toISOString(), 
          periodEnd: periodEndDate.toISOString() 
        }}
        headerSettings={headerSettings as any}
      />
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
        'Content-Disposition': `attachment; filename="archived-payslips-${periodStart}-${periodEnd}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error generating archived PDF payslips:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { 
        error: 'Failed to generate archived PDF payslips',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
