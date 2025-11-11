import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderToStream } from '@react-pdf/renderer'
import { PayslipsDocument } from '@/lib/pdf-payslip-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodStart, periodEnd } = await request.json()

    // Get the payroll entry for this user and period
    const payrollEntry = await prisma.payrollEntry.findFirst({
      where: {
        users_id: session.user.id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: {
          in: ['RELEASED', 'ARCHIVED']
        }
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    if (!payrollEntry) {
      return new NextResponse('Payroll not found', { status: 404 })
    }

    // Parse breakdown snapshot
    let snapshot = null
    try {
      snapshot = payrollEntry.breakdownSnapshot ? 
        (typeof payrollEntry.breakdownSnapshot === 'string' ? 
          JSON.parse(payrollEntry.breakdownSnapshot) : 
          payrollEntry.breakdownSnapshot) : null
    } catch (e) {
      console.error('Failed to parse snapshot:', e)
    }

    // Calculate values from snapshot
    const monthlyBasicSalary = snapshot?.monthlyBasicSalary || Number(payrollEntry.user?.personnelType?.basicSalary) || 0
    const semiMonthlyBase = monthlyBasicSalary / 2
    const overloadPay = snapshot?.totalAdditions || 0
    const grossPay = snapshot?.periodSalary || Number(payrollEntry.basicSalary)
    const totalDeductions = snapshot?.totalDeductions || Number(payrollEntry.deductions)
    const netPay = snapshot?.netPay || Number(payrollEntry.netPay)
    
    // Get header settings
    const headerSettings = await prisma.headerSettings.findFirst()
    
    // Format payslip data in the same structure as admin
    const payslipData = [{
      name: payrollEntry.user?.name || 'N/A',
      email: payrollEntry.user?.email || 'N/A',
      monthlyBasicSalary: monthlyBasicSalary,
      basicSalary: semiMonthlyBase,
      overloadPay: overloadPay,
      grossPay: grossPay,
      attendanceDeductions: snapshot?.attendanceRecords || [],
      totalDeductions: totalDeductions,
      netPay: netPay
    }]

    // Generate PDF using the same component as admin
    const pdfStream = await renderToStream(
      <PayslipsDocument
        employees={payslipData as any}
        period={{ 
          periodStart: new Date(periodStart).toISOString(), 
          periodEnd: new Date(periodEnd).toISOString() 
        }}
        headerSettings={headerSettings as any}
      />
    )

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of pdfStream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="payslip-${payrollEntry.user?.name}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating payslip:', error)
    return NextResponse.json({ error: 'Failed to generate payslip' }, { status: 500 })
  }
}
