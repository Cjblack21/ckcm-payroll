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
    
    // Get header settings or create default
    let headerSettings = await prisma.headerSettings.findFirst()
    console.log('📋 Header settings found:', !!headerSettings)
    
    if (!headerSettings) {
      console.log('⚠️ No header settings found, creating defaults...')
      headerSettings = await prisma.headerSettings.create({
        data: {
          schoolName: "Christ the King College De Maranding",
          schoolAddress: "Maranding Lala Lanao del Norte",
          systemName: "CKCM PMS (Payroll Management System)",
          logoUrl: "/ckcm.png",
          showLogo: true,
          headerAlignment: 'center',
          fontSize: 'medium',
          customText: "",
          workingDays: JSON.stringify(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        }
      })
      console.log('✅ Default header settings created')
    }

    // Get stored payroll entries for the period (same as archive route)
    // Use date range to handle timezone differences
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: { 
        periodStart: { gte: new Date(periodStart.getTime() - 86400000), lte: new Date(periodStart.getTime() + 86400000) },
        periodEnd: { gte: new Date(periodEnd.getTime() - 86400000), lte: new Date(periodEnd.getTime() + 86400000) }
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

      // Get deduction records for this user
      // For mandatory deductions (PhilHealth, SSS, Pag-IBIG), don't filter by date - they apply to every period
      // For other deductions, only include those within the current period
      const deductionRecords = await prisma.deduction.findMany({
        where: {
          users_id: entry.users_id,
          OR: [
            // Mandatory deductions - always include
            {
              deductionType: {
                isMandatory: true
              }
            },
            // Other deductions - only within period
            {
              deductionType: {
                isMandatory: false
              },
              appliedAt: { gte: entry.periodStart, lte: entry.periodEnd }
            }
          ]
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
      
      // Get overload pay for this user
      const overloadPayRecords = await prisma.overloadPay.findMany({
        where: {
          users_id: entry.users_id,
          archivedAt: null
        }
      })
      const totalOverloadPay = overloadPayRecords.reduce((sum, op) => sum + Number(op.amount), 0)
      const overloadPayDetails = overloadPayRecords.map(op => ({
        type: op.type || 'OVERTIME',
        amount: Number(op.amount)
      }))

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

      // SIMPLE SOLUTION: Use personnel type monthly salary and standard 22 working days
      const monthlyBasicSalary = entry.user?.personnelType?.basicSalary ? Number(entry.user.personnelType.basicSalary) : Number(entry.basicSalary) * 2
      const semiMonthlyBasicSalary = monthlyBasicSalary / 2
      
      // Daily salary = Monthly ÷ 22 (standard working days per month)
      const dailySalary = monthlyBasicSalary / 22
      const timeInEnd = attendanceSettings?.timeInEnd || '09:30'
      
      let totalAttendanceDeductions = 0
      const attendanceDeductionDetails: any[] = []
      
      attendanceRecords.forEach(record => {
        if (record.status === 'ABSENT') {
          attendanceDeductionDetails.push({
            date: record.date.toISOString().split('T')[0],
            amount: dailySalary,
            description: 'Absence deduction'
          })
          totalAttendanceDeductions += dailySalary
        } else if (record.status === 'LATE' && record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const expected = new Date(record.date)
          const [h, m] = timeInEnd.split(':').map(Number)
          expected.setHours(h, m, 0, 0)
          const perSecond = dailySalary / 8 / 60 / 60
          const secondsLate = Math.max(0, (timeIn.getTime() - expected.getTime()) / 1000)
          const amount = Math.min(secondsLate * perSecond, dailySalary * 0.5)
          if (amount > 0) {
            attendanceDeductionDetails.push({
              date: record.date.toISOString().split('T')[0],
              amount: amount,
              description: `Late arrival - ${Math.round(secondsLate / 60)} minutes late`
            })
            totalAttendanceDeductions += amount
          }
        } else if (record.status === 'PARTIAL') {
          let hoursWorked = 0
          if (record.timeIn && record.timeOut) {
            const timeIn = new Date(record.timeIn)
            const timeOut = new Date(record.timeOut)
            hoursWorked = Math.max(0, (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60))
          }
          const hourlyRate = dailySalary / 8
          const hoursShort = Math.max(0, 8 - hoursWorked)
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
      
      // Map deduction records with isMandatory flag preserved
      const otherDeductionDetails = otherDeductionRecords.map(deduction => ({
        type: deduction.deductionType.name,
        amount: Number(deduction.amount),
        description: deduction.deductionType.description || '',
        appliedAt: deduction.appliedAt.toISOString().split('T')[0],
        isMandatory: deduction.deductionType.isMandatory
      }))

      // Calculate loan details with purpose label
      const periodDays = Math.floor((entry.periodEnd.getTime() - entry.periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const loanFactor = periodDays <= 16 ? 0.5 : 1.0
      const loanDetails = loanRecords.map(loan => {
        const monthlyPayment = Number(loan.amount) * Number(loan.monthlyPaymentPercent) / 100
        const periodPayment = monthlyPayment * loanFactor
        return {
          type: loan.purpose || 'Loan Payment',
          amount: periodPayment,
          description: `${loan.purpose || 'Loan'} (${loan.monthlyPaymentPercent}% of ₱${Number(loan.amount).toLocaleString()})`,
          loanId: loan.loans_id
        }
      })

      // Calculate total deductions from all sources
      const totalLoanPayments = loanDetails.reduce((sum, detail) => sum + detail.amount, 0)
      const totalOtherDeductions = otherDeductionDetails.reduce((sum, detail) => sum + detail.amount, 0)
      const totalDeductions = totalAttendanceDeductions + totalLoanPayments + totalOtherDeductions
      
      // Calculate correct net pay: Semi-Monthly Basic + Overload - Total Deductions
      const grossPay = semiMonthlyBasicSalary + totalOverloadPay
      const correctNetPay = grossPay - totalDeductions
      
      return {
        users_id: entry.users_id,
        name: entry.user?.name || null,
        email: entry.user?.email || '',
        totalHours: attendanceDetails.reduce((sum, detail) => sum + detail.workHours, 0),
        totalSalary: correctNetPay, // Use calculated net pay
        released: entry.status === 'RELEASED',
        breakdown: {
          biweeklyBasicSalary: semiMonthlyBasicSalary, // Use semi-monthly basic salary
          realTimeEarnings: semiMonthlyBasicSalary + totalOverloadPay,
          realWorkHours: attendanceDetails.reduce((sum, detail) => sum + detail.workHours, 0),
          overtimePay: totalOverloadPay, // This is actually overload pay
          overloadPayDetails: overloadPayDetails, // Additional pay details with types
          attendanceDeductions: totalAttendanceDeductions,
          nonAttendanceDeductions: totalOtherDeductions,
          unpaidLeaveDeduction: 0,
          unpaidLeaveDays: 0,
          loanPayments: totalLoanPayments,
          grossPay: grossPay,
          totalDeductions: totalDeductions,
          netPay: correctNetPay, // Use calculated net pay
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
              <span class="label">Personnel:</span>
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
            <!-- Monthly Reference (Information Only) -->
            <div class="detail-row" style="color: #666; font-size: 0.9em; font-style: italic;">
              <span>Monthly Basic Salary (Reference):</span>
              <span>₱${(breakdown.personnelBasicSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            
            <!-- Earnings Section -->
            <div class="detail-row">
              <span>Basic Salary (Semi-Monthly):</span>
              <span>₱${(breakdown.biweeklyBasicSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            ${breakdown.overloadPayDetails && breakdown.overloadPayDetails.length > 0 ? 
              breakdown.overloadPayDetails.map((detail: any) => `
            <div class="detail-row" style="color: #2e7d32;">
              <span>+ ${detail.type === 'POSITION_PAY' ? 'Position Pay' : 
                         detail.type === 'BONUS' ? 'Bonus' : 
                         detail.type === '13TH_MONTH' ? '13th Month Pay' : 
                         detail.type === 'OVERTIME' ? 'Overtime' : 
                         detail.type}:</span>
              <span>₱${Number(detail.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
              `).join('') : 
              ((breakdown.overtimePay || 0) > 0 ? `
            <div class="detail-row" style="color: #2e7d32;">
              <span>+ Additional Pay:</span>
              <span>₱${(breakdown.overtimePay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
              ` : '')
            }
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
            
            ${(() => {
              const actualLoans = breakdown.loanDetails?.filter((loan: any) => !loan.type?.startsWith('[DEDUCTION]')) || []
              const deductionPayments = breakdown.loanDetails?.filter((loan: any) => loan.type?.startsWith('[DEDUCTION]')) || []
              
              let html = ''
              
              // Show actual loans
              if (actualLoans.length > 0) {
                html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Loan Payments:</div>
                    ${actualLoans.map((loan: any) => `
                      <div class="detail-row deduction-detail">
                        <span>${loan.description}</span>
                        <span class="deduction">-₱${loan.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    `).join('')}
                  </div>
                `
              }
              
              // Show deduction payments separately
              if (deductionPayments.length > 0) {
                html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Deduction Payments:</div>
                    ${deductionPayments.map((ded: any) => `
                      <div class="detail-row deduction-detail">
                        <span>${ded.description}</span>
                        <span class="deduction">-₱${ded.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    `).join('')}
                  </div>
                `
              }
              
              return html
            })()}
            
            ${(() => {
              const mandatoryDeductions = breakdown.otherDeductionDetails?.filter((d: any) => d.isMandatory) || []
              const otherDeductions = breakdown.otherDeductionDetails?.filter((d: any) => !d.isMandatory) || []
              
              let html = ''
              
              if (mandatoryDeductions.length > 0) {
                html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Mandatory Deductions:</div>
                    ${mandatoryDeductions.map((deduction: any) => `
                      <div class="detail-row deduction-detail">
                        <span>${deduction.type}${deduction.description ? ` (${deduction.appliedAt})` : ''}</span>
                        <span class="deduction">-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    `).join('')}
                  </div>
                `
              }
              
              if (otherDeductions.length > 0) {
                html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Other Deductions:</div>
                    ${otherDeductions.map((deduction: any) => `
                      <div class="detail-row deduction-detail">
                        <span>${deduction.description} (${deduction.appliedAt})</span>
                        <span class="deduction">-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    `).join('')}
                  </div>
                `
              }
              
              return html
            })()}
            
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
            margin-bottom: 2px;
          }
          .logo {
            height: 30px;
            width: auto;
            max-width: 100px;
            object-fit: contain;
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