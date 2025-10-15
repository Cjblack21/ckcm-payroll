import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Function to get current biweekly period (same as payroll summary API)
function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  
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

export async function POST(request: NextRequest) {
  console.log('🔍 Screenshot route called - START')
  
  try {
    console.log('🔍 Getting session...')
    const session = await getServerSession(authOptions)
    console.log('🔍 Session result:', session ? 'Found' : 'Not found')
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('❌ Unauthorized access - session:', session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Admin session verified - user:', session.user.email)

    // Get period dates from request body, fallback to current period
    let body: any = {}
    try {
      body = await request.json()
      console.log('📝 Request body:', body)
    } catch (error) {
      console.log('⚠️ Failed to parse request body:', error)
    }

    console.log('🔍 Proceeding with full payslip generation...')
    
    let periodStart: Date
    let periodEnd: Date
    
    if (body.periodStart && body.periodEnd) {
      periodStart = new Date(body.periodStart)
      periodEnd = new Date(body.periodEnd)
      console.log('📅 Using provided period:', periodStart.toISOString(), 'to', periodEnd.toISOString())
    } else {
      const currentPeriod = getCurrentBiweeklyPeriod()
      periodStart = currentPeriod.periodStart
      periodEnd = currentPeriod.periodEnd
      console.log('📅 Using current period:', periodStart.toISOString(), 'to', periodEnd.toISOString())
    }

    // USE STORED PAYROLL DATA APPROACH: Get existing payroll entries with correct breakdown
    console.log('🔧 Using stored payroll data from archive (correct breakdown)...')
    
    // Get header settings
    const headerSettings = await prisma.headerSettings.findFirst()
    console.log('📋 Header settings found:', !!headerSettings)

    // Get stored payroll entries for the period (same as archive route)
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: { 
        periodStart: periodStart, 
        periodEnd: periodEnd 
      },
      include: {
        user: { 
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
        }
      }
    })
    console.log('👥 Found stored payroll entries:', payrollEntries.length)

    // Use stored payroll data directly - no need for fresh calculations
    if (payrollEntries.length === 0) {
      console.log('❌ No stored payroll entries found for this period')
      return NextResponse.json(
        { error: 'No payroll data found for the specified period. Please generate payroll first.' },
        { status: 404 }
      )
    }

    // Get detailed breakdown data (same logic as archive route)
    const payslipData = await Promise.all(payrollEntries.map(async (entry) => {
      // Get attendance records for this user and period
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          users_id: entry.users_id,
          date: { gte: entry.periodStart, lte: entry.periodEnd }
        }
      })

      // Get deduction records for this user and period
      const deductionRecords = await prisma.deduction.findMany({
        where: {
          users_id: entry.users_id,
          appliedAt: { gte: entry.periodStart, lte: entry.periodEnd }
        },
        include: {
          deductionType: true
        }
      })

      // Get loan records for this user
      const loanRecords = await prisma.loan.findMany({
        where: {
          users_id: entry.users_id,
          status: 'ACTIVE'
        }
      })

      // Get attendance settings
      const attendanceSettings = await prisma.attendanceSettings.findFirst()

      // Calculate attendance details
      const attendanceDetails = attendanceRecords.map(record => {
        let workHours = 0
        if (record.timeIn && record.timeOut) {
          const timeIn = new Date(record.timeIn)
          const timeOut = new Date(record.timeOut)
          workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        }
        return {
          date: record.date.toISOString().split('T')[0],
          status: record.status,
          timeIn: record.timeIn?.toISOString().split('T')[1]?.substring(0, 5) || null,
          timeOut: record.timeOut?.toISOString().split('T')[1]?.substring(0, 5) || null,
          workHours: workHours
        }
      })

      // Calculate attendance deduction details
      const basicSalary = entry.user?.personnelType?.basicSalary ? Number(entry.user.personnelType.basicSalary) : Number(entry.basicSalary)
      const workingDaysInPeriod = Math.floor((entry.periodEnd.getTime() - entry.periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const timeInEnd = attendanceSettings?.timeInEnd || '09:30'
      
      const attendanceDeductionDetails: any[] = []
      let totalAttendanceDeductions = 0
      
      attendanceRecords.forEach(record => {
        if (record.status === 'LATE' && record.timeIn) {
          // Calculate late deduction
          const timeIn = new Date(record.timeIn)
          const expected = new Date(record.date)
          const [h, m] = timeInEnd.split(':').map(Number)
          const adjM = m + 1 // Deductions start 1 minute after timeInEnd
          if (adjM >= 60) {
            expected.setHours(h + 1, adjM - 60, 0, 0)
          } else {
            expected.setHours(h, adjM, 0, 0)
          }
          
          const perSecond = (basicSalary / workingDaysInPeriod / 8 / 60 / 60)
          const secondsLate = Math.max(0, (timeIn.getTime() - expected.getTime()) / 1000)
          const daily = basicSalary / workingDaysInPeriod
          const amount = Math.min(secondsLate * perSecond, daily * 0.5)
          
          if (amount > 0) {
            attendanceDeductionDetails.push({
              date: record.date.toISOString().split('T')[0],
              amount: amount,
              description: `Late arrival - ${Math.round(secondsLate / 60)} minutes late`
            })
            totalAttendanceDeductions += amount
          }
        } else if (record.status === 'ABSENT') {
          const amount = basicSalary / workingDaysInPeriod
          attendanceDeductionDetails.push({
            date: record.date.toISOString().split('T')[0],
            amount: amount,
            description: 'Absence deduction'
          })
          totalAttendanceDeductions += amount
        } else if (record.status === 'PARTIAL') {
          // Calculate partial deduction
          let hoursShort = 8
          if (record.timeIn && record.timeOut) {
            const timeIn = new Date(record.timeIn)
            const timeOut = new Date(record.timeOut)
            const hoursWorked = Math.max(0, (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60))
            hoursShort = Math.max(0, 8 - hoursWorked)
          }
          const hourlyRate = (basicSalary / workingDaysInPeriod) / 8
          const amount = hoursShort * hourlyRate
          
          if (amount > 0) {
            attendanceDeductionDetails.push({
              date: record.date.toISOString().split('T')[0],
              amount: amount,
              description: `Partial attendance - ${hoursShort.toFixed(1)} hours short`
            })
            totalAttendanceDeductions += amount
          }
        }
      })

      // Get other deduction records (non-attendance related)
      const otherDeductionRecords = deductionRecords.filter(deduction => 
        !['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Early Time-Out', 'Partial Attendance'].includes(deduction.deductionType.name)
      )
      
      const otherDeductionDetails = otherDeductionRecords.map(deduction => ({
        type: deduction.deductionType.name,
        amount: Number(deduction.amount),
        description: `${deduction.deductionType.name} - ${deduction.deductionType.description || 'Other deduction'}`,
        appliedAt: deduction.appliedAt.toISOString().split('T')[0]
      }))

      // Calculate loan details
      const periodDays = Math.floor((entry.periodEnd.getTime() - entry.periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const loanFactor = periodDays <= 16 ? 0.5 : 1.0
      const loanDetails = loanRecords.map(loan => {
        const monthlyPayment = Number(loan.amount) * Number(loan.monthlyPaymentPercent) / 100
        const periodPayment = monthlyPayment * loanFactor
        return {
          type: 'Loan Payment',
          amount: periodPayment,
          description: `Loan Payment (${loan.monthlyPaymentPercent}% of ₱${Number(loan.amount).toLocaleString()})`,
          loanId: loan.loans_id
        }
      })

      return {
        users_id: entry.users_id,
        name: entry.user?.name || null,
        email: entry.user?.email || '',
        totalHours: attendanceDetails.reduce((sum, detail) => sum + detail.workHours, 0),
        totalSalary: Number(entry.netPay),
        released: entry.status === 'RELEASED',
        breakdown: {
          biweeklyBasicSalary: Number(entry.basicSalary), // Use stored basic salary (correct per-payroll amount)
          realTimeEarnings: Number(entry.basicSalary) + Number(entry.overtime),
          realWorkHours: attendanceDetails.reduce((sum, detail) => sum + detail.workHours, 0),
          overtimePay: Number(entry.overtime),
          attendanceDeductions: totalAttendanceDeductions,
          nonAttendanceDeductions: otherDeductionDetails.reduce((sum, detail) => sum + detail.amount, 0),
          loanPayments: loanDetails.reduce((sum, detail) => sum + detail.amount, 0),
          grossPay: Number(entry.basicSalary) + Number(entry.overtime),
          totalDeductions: Number(entry.deductions),
          netPay: Number(entry.netPay),
          // Detailed breakdown with sources
          attendanceDetails: attendanceDetails,
          attendanceDeductionDetails: attendanceDeductionDetails,
          totalAttendanceDeductions: totalAttendanceDeductions,
          loanDetails: loanDetails,
          otherDeductionDetails: otherDeductionDetails,
          // personnelType name not selected in query
          personnelBasicSalary: Number(entry.user?.personnelType?.basicSalary || 0)
        }
      }
    }))

    console.log('📊 Generated payslip data for', payslipData.length, 'users')

    // Generate HTML for payslips
    const generatePayslipHTML = (employee: any) => {
      const breakdown = employee.breakdown
      return `
        <div class="payslip-card">
          <div class="payslip-header">
            <div class="logo-container">
              ${headerSettings?.showLogo ? `
                <img src="${headerSettings.logoUrl}" alt="Logo" class="logo" onerror="this.src='/ckcm.png'">
              ` : ''}
            </div>
            <div class="school-name">${headerSettings?.schoolName || 'PAYSLIP'}</div>
            <div class="school-address">${headerSettings?.schoolAddress || ''}</div>
            <div class="system-name">${headerSettings?.systemName || ''}</div>
            ${headerSettings?.customText ? `<div class="custom-text">${headerSettings.customText}</div>` : ''}
            <div class="payslip-title">PAYSLIP</div>
          </div>
          
          <div class="employee-info">
            <div class="info-row">
              <span class="label">Employee:</span>
              <span class="value">${employee.name || employee.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${employee.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Period:</span>
              <span class="value">${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div class="payroll-details">
            <!-- Earnings Section -->
            <div class="detail-row">
              <span>Basic Salary:</span>
              <span>₱${(breakdown.biweeklyBasicSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            ${(breakdown.overtimePay || 0) > 0 ? `
            <div class="detail-row">
              <span>Overtime:</span>
              <span>₱${(breakdown.overtimePay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            ` : ''}
            <div class="detail-row total">
              <span>GROSS PAY:</span>
              <span>₱${(breakdown.grossPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            
            <!-- Detailed Deductions Section -->
            ${breakdown.attendanceDeductionDetails && breakdown.attendanceDeductionDetails.length > 0 ? `
              <div class="deduction-section">
                <div class="deduction-title">Attendance Deductions:</div>
                ${breakdown.attendanceDeductionDetails.map((deduction: any) => `
                  <div class="detail-row deduction-detail">
                    <span>${deduction.date}: ${deduction.description}</span>
                    <span class="deduction">-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${breakdown.loanDetails && breakdown.loanDetails.length > 0 ? `
              <div class="deduction-section">
                <div class="deduction-title">Loan Payments:</div>
                ${breakdown.loanDetails.map((loan: any) => `
                  <div class="detail-row deduction-detail">
                    <span>${loan.description}</span>
                    <span class="deduction">-₱${loan.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${breakdown.otherDeductionDetails && breakdown.otherDeductionDetails.length > 0 ? `
              <div class="deduction-section">
                <div class="deduction-title">Other Deductions:</div>
                ${breakdown.otherDeductionDetails.map((deduction: any) => `
                  <div class="detail-row deduction-detail">
                    <span>${deduction.description} (${deduction.appliedAt})</span>
                    <span class="deduction">-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div class="detail-row net-pay">
              <span>NET PAY:</span>
              <span>₱${(breakdown.netPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div class="status">Status: RELEASED</div>
        </div>
      `
    }

    // Group payslips into pages of 6
    const employeesPerPage = 6
    const pages = []
    for (let i = 0; i < payslipData.length; i += employeesPerPage) {
      pages.push(payslipData.slice(i, i + employeesPerPage))
    }

    console.log('📄 Generated', pages.length, 'pages')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payroll Slips - Perfect Layout</title>
        <style>
          @page {
            size: 8.5in 13in;
            margin: 0.15in;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background: white;
            margin: 0;
            padding: 0;
          }
          .page {
            width: 8.2in;
            height: 12.7in;
            margin: 0;
            padding: 0.05in;
            page-break-after: always;
            position: relative;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .payslip-card {
            width: 3.6in;
            height: 3.8in;
            border: 1px solid #000;
            padding: 6px;
            font-size: 12px;
            line-height: 1.3;
            display: flex;
            flex-direction: column;
            background: white;
            box-sizing: border-box;
            overflow: hidden;
            position: absolute;
          }
          .payslip-card:nth-child(1) { top: 0.1in; left: 0.1in; }
          .payslip-card:nth-child(2) { top: 0.1in; left: 3.8in; }
          .payslip-card:nth-child(3) { top: 4.0in; left: 0.1in; }
          .payslip-card:nth-child(4) { top: 4.0in; left: 3.8in; }
          .payslip-card:nth-child(5) { top: 7.9in; left: 0.1in; }
          .payslip-card:nth-child(6) { top: 7.9in; left: 3.8in; }
          .payslip-header {
            text-align: center;
            margin-bottom: 6px;
            border-bottom: 1px solid #000;
            padding-bottom: 6px;
            font-size: 14px;
          }
          .logo-container {
            margin-bottom: 0.5px;
          }
          .logo {
            height: 14px;
            width: auto;
          }
          .school-name {
            font-weight: bold;
            font-size: 9px;
            margin-bottom: 1px;
          }
          .school-address, .system-name, .custom-text {
            font-size: 7px;
            color: #666;
            margin-bottom: 1px;
          }
          .payslip-title {
            font-weight: bold;
            margin-top: 3px;
            font-size: 13px;
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 3px;
          }
          .employee-info {
            margin-bottom: 2px;
            font-size: 10px;
          }
          .info-row {
            margin-bottom: 1px;
            display: flex;
            justify-content: space-between;
          }
          .label {
            font-weight: bold;
          }
          .value {
            margin-left: 3px;
          }
          .payroll-details {
            flex: 1;
            margin: 2px 0;
            border-top: 1px solid #ccc;
            padding-top: 2px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            font-size: 10px;
          }
          .detail-row.total {
            border-top: 1px solid #000;
            padding-top: 0.5px;
            font-weight: bold;
          }
          .detail-row.net-pay {
            border-top: 2px solid #000;
            padding-top: 3px;
            font-weight: bold;
            font-size: 11px;
            margin-top: 2px;
          }
          .deduction {
            color: #d32f2f;
          }
          .deduction-section {
            margin: 1px 0;
            border-left: 1px solid #ccc;
            padding-left: 2px;
          }
          .deduction-title {
            font-size: 10px;
            font-weight: bold;
            color: #666;
            margin-bottom: 2px;
          }
          .deduction-detail {
            margin-left: 4px;
            font-size: 9px;
          }
          .status {
            margin-top: 2px;
            font-size: 9px;
            text-align: center;
            color: #666;
          }
        </style>
        <script>
          // Auto-print on load
          window.onload = function() {
            console.log('Payslip page loaded - auto printing...');
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </head>
      <body>
        ${pages.map((pageEmployees, pageIndex) => `
          <div class="page">
            ${pageEmployees.map(employee => generatePayslipHTML(employee)).join('')}
          </div>
        `).join('')}
      </body>
      </html>
    `

    console.log('✅ Generated HTML content successfully')

    // Return HTML content
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    })

  } catch (error) {
    console.error('❌ Error generating screenshot payslips:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })
    return NextResponse.json(
      { 
        error: 'Failed to generate payslips',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}