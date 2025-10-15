import { prisma } from "@/lib/prisma"

export interface PayslipData {
  users_id: string
  name: string | null
  email: string
  totalHours: number
  totalSalary: number
  released: boolean
  breakdown: {
    biweeklyBasicSalary: number
    realTimeEarnings: number
    realWorkHours: number
    overtimePay: number
    attendanceDeductions: number
    nonAttendanceDeductions: number
    loanPayments: number
    grossPay: number
    totalDeductions: number
    netPay: number
    deductionDetails: any[]
  }
}

export interface HeaderSettings {
  schoolName: string
  schoolAddress: string
  systemName: string
  logoUrl: string
  showLogo: boolean
  headerAlignment: 'left' | 'center' | 'right'
  fontSize: 'small' | 'medium' | 'large'
  customText?: string
}

export async function getHeaderSettings(): Promise<HeaderSettings | null> {
  try {
    const settings = await prisma.headerSettings.findFirst()
    if (!settings) return null
    
    // Type cast to match interface
    return {
      schoolName: settings.schoolName,
      schoolAddress: settings.schoolAddress,
      systemName: settings.systemName,
      logoUrl: settings.logoUrl,
      showLogo: settings.showLogo,
      headerAlignment: settings.headerAlignment as 'left' | 'center' | 'right',
      fontSize: settings.fontSize as 'small' | 'medium' | 'large',
      customText: settings.customText || undefined
    }
  } catch (error) {
    console.error('Error fetching header settings:', error)
    return null
  }
}

export function generatePayslipHTML(
  employee: PayslipData,
  period: { periodStart: string; periodEnd: string },
  headerSettings: HeaderSettings | null
): string {
  const breakdown = employee.breakdown
  
  return `
    <div class="payslip" style="
      width: 100%;
      height: 100%;
      border: 1px solid #000;
      margin: 0;
      padding: 3px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      font-size: 6px;
      line-height: 1.0;
      page-break-inside: avoid;
      overflow: hidden;
    ">
      ${headerSettings ? `
        <div style="text-align: ${headerSettings.headerAlignment}; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px;">
          ${headerSettings.showLogo ? `
            <div style="margin-bottom: 1px;">
              <img src="${headerSettings.logoUrl}" alt="Logo" style="height: 12px; width: auto;" onerror="this.src='/ckcm.png'">
            </div>
          ` : ''}
          <div style="font-weight: bold; font-size: ${headerSettings.fontSize === 'small' ? '5px' : headerSettings.fontSize === 'large' ? '6px' : '5px'}; margin-bottom: 1px; line-height: 1.0;">
            ${headerSettings.schoolName}
          </div>
          <div style="font-size: 4px; color: #666; margin-bottom: 1px; line-height: 1.0;">
            ${headerSettings.schoolAddress}
          </div>
          <div style="font-size: 4px; color: #666; margin-bottom: 1px; line-height: 1.0;">
            ${headerSettings.systemName}
          </div>
          ${headerSettings.customText ? `
            <div style="font-size: 4px; color: #666; margin-bottom: 1px; line-height: 1.0;">
              ${headerSettings.customText}
            </div>
          ` : ''}
          <div style="font-weight: bold; margin-top: 1px; border-top: 1px solid #ccc; padding-top: 1px; font-size: 6px;">
            PAYSLIP
          </div>
        </div>
      ` : `
        <div style="text-align: center; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 7px;">
          PAYSLIP
        </div>
      `}
      
      <div style="margin-bottom: 2px;">
        <strong>Employee:</strong> ${employee.name || employee.email}
      </div>
      <div style="margin-bottom: 2px;">
        <strong>Email:</strong> ${employee.email}
      </div>
      <div style="margin-bottom: 2px;">
        <strong>Period:</strong> ${new Date(period.periodStart).toLocaleDateString()} - ${new Date(period.periodEnd).toLocaleDateString()}
      </div>
      
      <div style="margin: 4px 0; border-top: 1px solid #ccc; padding-top: 2px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
          <span>Work Hours:</span>
          <span>${employee.totalHours.toFixed(2)} hrs</span>
        </div>
        ${breakdown ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span>Basic:</span>
            <span>₱${(breakdown.biweeklyBasicSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span>OT:</span>
            <span>₱${(breakdown.overtimePay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px; border-top: 1px solid #ccc; padding-top: 1px;">
            <span><strong>Gross:</strong></span>
            <span><strong>₱${(breakdown.grossPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span>Att. Ded:</span>
            <span>-₱${(breakdown.attendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span>Other Ded:</span>
            <span>-₱${(breakdown.nonAttendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span>Loans:</span>
            <span>-₱${(breakdown.loanPayments || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          ${breakdown.deductionDetails && breakdown.deductionDetails.length > 0 ? `
            <div style="margin-top: 2px; padding-top: 2px; border-top: 1px solid #eee; font-size: 6px;">
              <div style="font-weight: bold; margin-bottom: 1px;">Deduction Details:</div>
              ${breakdown.deductionDetails.map((deduction: any) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5px;">
                  <span style="max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${deduction.description}">${deduction.type}:</span>
                  <span>-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px; border-top: 1px solid #ccc; padding-top: 1px;">
            <span><strong>Total Ded:</strong></span>
            <span><strong>-₱${(breakdown.totalDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-top: 2px; border-top: 2px solid #000; padding-top: 1px; font-weight: bold; font-size: 8px;">
          <span>NET PAY:</span>
          <span>₱${employee.totalSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <div style="margin-top: 2px; font-size: 6px; text-align: center; color: #666;">
        Status: ${employee.released ? 'RELEASED' : 'PENDING'}
      </div>
    </div>
  `
}

export function generatePayslipsHTML(
  employees: PayslipData[],
  period: { periodStart: string; periodEnd: string },
  headerSettings: HeaderSettings | null,
  employeesPerPage: number = 6
): string {
  // Group employees into pages
  const pages = []
  for (let i = 0; i < employees.length; i += employeesPerPage) {
    pages.push(employees.slice(i, i + employeesPerPage))
  }

  const pageContent = pages.map((pageEmployees, pageIndex) => {
    const payslips = pageEmployees.map((employee, index) => {
      return generatePayslipHTML(employee, period, headerSettings)
    }).join('')

    return `
      <div class="page" style="
        width: 8.5in;
        height: 13in;
        margin: 0;
        padding: 0.25in;
        box-sizing: border-box;
        ${pageIndex > 0 ? 'page-break-before: always;' : ''}
        clear: both;
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 0;
        ">
          ${payslips}
        </div>
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payroll Slips</title>
      <style>
        @media print {
          @page {
            size: 8.5in 13in;
            margin: 0.2in;
          }
          .page {
            page-break-after: always;
            width: 8.1in;
            height: 12.6in;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .payslip {
            width: 100% !important;
            height: 100% !important;
            float: none !important;
          }
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: white;
        }
        .page {
          width: 8.1in;
          height: 12.6in;
          margin: 0;
          padding: 0.1in;
          box-sizing: border-box;
        }
        .payslip {
          width: 100%;
          height: 100%;
          border: 1px solid #000;
          margin: 0;
          padding: 3px;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          font-size: 6px;
          line-height: 1.0;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      ${pageContent}
    </body>
    </html>
  `
}
