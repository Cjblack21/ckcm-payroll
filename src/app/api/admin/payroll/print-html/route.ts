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

function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const currentDate = now.getDate()

  let periodStart: Date
  let periodEnd: Date

  if (currentDate <= 15) {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    periodEnd = new Date(now.getFullYear(), now.getMonth(), 15)
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 16)
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
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
      if (!user?.personnelType?.basicSalary || !record.timeIn) continue

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
        const lateDeduction = await calculateLateDeduction(monthlySalary, timeIn, expectedTimeIn)

        earningsMap.set(record.users_id, (earningsMap.get(record.users_id) || 0) + earnings)
        workHoursMap.set(record.users_id, (workHoursMap.get(record.users_id) || 0) + workHours)
        attendanceDeductionsMap.set(record.users_id, (attendanceDeductionsMap.get(record.users_id) || 0) + lateDeduction)
      } else if (record.status === 'ABSENT') {
        const absenceDeduction = await calculateAbsenceDeduction(monthlySalary)
        attendanceDeductionsMap.set(record.users_id, (attendanceDeductionsMap.get(record.users_id) || 0) + absenceDeduction)
      } else if (record.status === 'PARTIAL' && timeOut) {
        const workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        const partialDeduction = await calculatePartialDeduction(monthlySalary, workHours)

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

    // Generate HTML for payslips
    const generatePayslipHTML = (employee: any) => {
      const breakdown = employee.breakdown
      return `
        <div class="payslip">
          <div class="header">
            ${headerSettings?.showLogo ? `
              <div class="logo">
                <img src="${headerSettings.logoUrl.startsWith('http') ? headerSettings.logoUrl : 'http://localhost:3000' + headerSettings.logoUrl}" alt="Logo" onerror="this.src='http://localhost:3000/brgy-logo.png'">
              </div>
            ` : ''}
            <div class="school-name">${headerSettings?.schoolName || 'PAYSLIP'}</div>
            <div class="school-address">${headerSettings?.schoolAddress || ''}</div>
            <div class="system-name">${headerSettings?.systemName || ''}</div>
            ${headerSettings?.customText ? `
              <div class="custom-text">${headerSettings.customText}</div>
            ` : ''}
            <div class="payslip-title">PAYSLIP</div>
          </div>
          
          <div class="employee-info">
            <div><strong>Employee:</strong> ${employee.name || employee.email}</div>
            <div><strong>Email:</strong> ${employee.email}</div>
            <div><strong>Period:</strong> ${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}</div>
          </div>
          
          <div class="payroll-details">
            <div class="detail-row">
              <span>Work Hours:</span>
              <span>${employee.totalHours.toFixed(2)} hrs</span>
            </div>
            ${breakdown ? `
              <div class="detail-row">
                <span>Basic:</span>
                <span>₱${(breakdown.biweeklyBasicSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div class="detail-row">
                <span>OT:</span>
                <span>₱${(breakdown.overtimePay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div class="detail-row total">
                <span><strong>Gross:</strong></span>
                <span><strong>₱${(breakdown.grossPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
              </div>
              <div class="detail-row">
                <span>Att. Ded:</span>
                <span>-₱${(breakdown.attendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div class="detail-row">
                <span>Other Ded:</span>
                <span>-₱${(breakdown.nonAttendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div class="detail-row">
                <span>Loans:</span>
                <span>-₱${(breakdown.loanPayments || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div class="detail-row total">
                <span><strong>Total Ded:</strong></span>
                <span><strong>-₱${(breakdown.totalDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
              </div>
            ` : ''}
            <div class="detail-row net-pay">
              <span>NET PAY:</span>
              <span>₱${employee.totalSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div class="status">
            Status: ${employee.released ? 'RELEASED' : 'PENDING'}
          </div>
        </div>
      `
    }

    // Group employees into pages of 6
    const employeesPerPage = 6
    const pages = []
    for (let i = 0; i < payslipData.length; i += employeesPerPage) {
      pages.push(payslipData.slice(i, i + employeesPerPage))
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payroll Slips</title>
        <style>
          @page {
            size: 8.5in 13in;
            margin: 0.25in;
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
            width: 8.5in;
            height: 13in;
            margin: 0;
            padding: 0.25in;
            page-break-after: always;
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .payslip {
            width: 3.75in;
            height: 4in;
            border: 1px solid #000;
            margin: 0;
            padding: 8px;
            font-size: 8px;
            line-height: 1.1;
            display: flex;
            flex-direction: column;
          }
          .header {
            text-align: center;
            margin-bottom: 4px;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }
          .logo img {
            height: 16px;
            width: auto;
            margin-bottom: 1px;
          }
          .school-name {
            font-weight: bold;
            font-size: 8px;
            margin-bottom: 1px;
          }
          .school-address, .system-name, .custom-text {
            font-size: 6px;
            color: #666;
            margin-bottom: 1px;
          }
          .payslip-title {
            font-weight: bold;
            margin-top: 1px;
            border-top: 1px solid #ccc;
            padding-top: 1px;
            font-size: 8px;
          }
          .employee-info {
            margin-bottom: 2px;
            font-size: 7px;
          }
          .employee-info div {
            margin-bottom: 1px;
          }
          .payroll-details {
            flex: 1;
            margin: 4px 0;
            border-top: 1px solid #ccc;
            padding-top: 2px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            font-size: 7px;
          }
          .detail-row.total {
            border-top: 1px solid #ccc;
            padding-top: 1px;
          }
          .detail-row.net-pay {
            border-top: 2px solid #000;
            padding-top: 1px;
            font-weight: bold;
            font-size: 8px;
            margin-top: 2px;
          }
          .status {
            margin-top: 2px;
            font-size: 6px;
            text-align: center;
            color: #666;
          }
        </style>
        <script>
          // Add print button functionality and debugging
          window.onload = function() {
            console.log('Payslip page loaded successfully');
            
            // Create print button
            const printButton = document.createElement('button');
            printButton.innerHTML = '🖨️ Print Payslips';
            printButton.style.cssText = 
              'position: fixed;' +
              'top: 20px;' +
              'right: 20px;' +
              'background: #007bff;' +
              'color: white;' +
              'border: none;' +
              'padding: 10px 20px;' +
              'border-radius: 5px;' +
              'cursor: pointer;' +
              'font-size: 16px;' +
              'z-index: 1000;' +
              'box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
            printButton.onclick = function() {
              console.log('Print button clicked');
              try {
                window.print();
                console.log('Print dialog should have opened');
              } catch (error) {
                console.error('Print failed:', error);
                alert('Print failed: ' + error.message);
              }
            };
            document.body.appendChild(printButton);
            
            // Add status message
            const statusDiv = document.createElement('div');
            statusDiv.innerHTML = '✅ Payslips loaded. Click the print button or press Ctrl+P to print.';
            statusDiv.style.cssText = 
              'position: fixed;' +
              'top: 20px;' +
              'left: 20px;' +
              'background: #28a745;' +
              'color: white;' +
              'padding: 10px 20px;' +
              'border-radius: 5px;' +
              'font-size: 14px;' +
              'z-index: 1000;' +
              'box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
            document.body.appendChild(statusDiv);
            
            // Auto-hide status after 5 seconds
            setTimeout(() => {
              if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
              }
            }, 5000);
            
            // Also add keyboard shortcut
            document.addEventListener('keydown', function(e) {
              if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                console.log('Ctrl+P pressed');
                window.print();
              }
            });
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

    // Return HTML content
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    })

  } catch (error) {
    console.error('Error generating HTML payslips:', error)
    return NextResponse.json(
      { error: 'Failed to generate payslips' },
      { status: 500 }
    )
  }
}
