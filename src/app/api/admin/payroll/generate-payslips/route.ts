import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodStart, periodEnd } = await request.json()

    // Get header settings for payslip generation
    const headerSettings = await prisma.headerSettings.findFirst()
    
    if (!headerSettings) {
      return NextResponse.json({ error: 'Header settings not configured' }, { status: 400 })
    }

    // Determine period dates
    let startDate: Date
    let endDate: Date
    
    if (periodStart && periodEnd) {
      startDate = new Date(periodStart)
      endDate = new Date(periodEnd)
    } else {
      // Auto-determine current period
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      
      if (now.getDate() <= 15) {
        startDate = new Date(currentYear, currentMonth, 1)
        endDate = new Date(currentYear, currentMonth, 15)
      } else {
        startDate = new Date(currentYear, currentMonth, 16)
        endDate = new Date(currentYear, currentMonth + 1, 0)
      }
    }

    // Get released payroll entries
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: {
        periodStart: startDate,
        periodEnd: endDate,
        status: 'RELEASED'
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    if (payrollEntries.length === 0) {
      return NextResponse.json({ error: 'No released payroll entries found for this period' }, { status: 400 })
    }

    // Generate payslips HTML for Long Bond Paper (8.5 × 13 in)
    const payslipsPerPage = 6
    const payslipHeight = 2.1 // inches
    const pageMargin = 0.2 // inches
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payslips - ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</title>
    <style>
        @page {
            size: 8.5in 13in;
            margin: 0.2in;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 8px;
        }
        
        .payslip {
            width: 3.7in;
            height: 2.1in;
            border: 1px solid #000;
            margin-bottom: 0.05in;
            margin-right: 0.1in;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            padding: 0.05in;
            box-sizing: border-box;
            float: left;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #000;
            padding-bottom: 0.05in;
            margin-bottom: 0.05in;
        }
        
        .company-info {
            text-align: center;
            flex: 1;
        }
        
        .company-logo {
            width: 0.5in;
            height: 0.5in;
            object-fit: contain;
        }
        
        .company-name {
            font-size: 12px;
            font-weight: bold;
            margin: 0;
        }
        
        .company-address {
            font-size: 8px;
            margin: 0;
        }
        
        .payslip-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
        }
        
        .employee-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.05in;
        }
        
        .info-section {
            flex: 1;
        }
        
        .info-row {
            display: flex;
            margin-bottom: 0.02in;
        }
        
        .info-label {
            font-weight: bold;
            width: 1.2in;
        }
        
        .info-value {
            flex: 1;
        }
        
        .earnings-deductions {
            display: flex;
            flex: 1;
        }
        
        .earnings, .deductions {
            flex: 1;
            margin: 0 0.05in;
        }
        
        .section-title {
            font-weight: bold;
            border-bottom: 1px solid #000;
            margin-bottom: 0.03in;
            padding-bottom: 0.02in;
        }
        
        .amount-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.02in;
        }
        
        .net-pay {
            border-top: 2px solid #000;
            padding-top: 0.03in;
            margin-top: 0.05in;
            font-weight: bold;
            font-size: 11px;
        }
        
        .net-pay-row {
            display: flex;
            justify-content: space-between;
            background-color: #f0f0f0;
            padding: 0.02in;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>`

    // Generate payslips in groups of 6
    for (let i = 0; i < payrollEntries.length; i += payslipsPerPage) {
      const pageEntries = payrollEntries.slice(i, i + payslipsPerPage)
      
      pageEntries.forEach((entry, index) => {
        html += `
        <div class="payslip">
            <div class="header">
                <div class="company-info">
                    ${headerSettings.showLogo ? `<img src="${headerSettings.logoUrl}" alt="Logo" class="company-logo">` : ''}
                    <div class="company-name">${headerSettings.schoolName}</div>
                    <div class="company-address">${headerSettings.schoolAddress}</div>
                </div>
                <div class="payslip-title">PAYSLIP</div>
            </div>
            
            <div class="employee-info">
                <div class="info-section">
                    <div class="info-row">
                        <div class="info-label">Employee:</div>
                        <div class="info-value">${entry.user.name || entry.user.email}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Email:</div>
                        <div class="info-value">${entry.user.email}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Period:</div>
                        <div class="info-value">${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
            
            <div class="earnings-deductions">
                <div class="earnings">
                    <div class="section-title">EARNINGS</div>
                    <div class="amount-row">
                        <span>Total Work Hours:</span>
                        <span>8h</span>
                    </div>
                    <div class="amount-row">
                        <span>Basic Salary:</span>
                        <span>₱${Number(entry.basicSalary).toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="deductions">
                    <div class="section-title">DEDUCTIONS</div>
                    <div class="amount-row">
                        <span>Attendance Deductions:</span>
                        <span>₱${Number(entry.deductions).toLocaleString()}</span>
                    </div>
                    <div class="amount-row">
                        <span>Loan Payments:</span>
                        <span>₱0</span>
                    </div>
                    <div class="amount-row">
                        <span>Total Deductions:</span>
                        <span>₱${Number(entry.deductions).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div class="net-pay">
                <div class="net-pay-row">
                    <span>FINAL NET PAY:</span>
                    <span>₱${Number(entry.netPay).toLocaleString()}</span>
                </div>
            </div>
        </div>`
      })
      
      // Add page break if there are more pages
      if (i + payslipsPerPage < payrollEntries.length) {
        html += '<div class="page-break"></div>'
      }
    }

    html += `
</body>
</html>`

    // Note: Audit logging would require adding auditLog model to schema

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="payslips-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating payslips:', error)
    return NextResponse.json({ error: 'Failed to generate payslips' }, { status: 500 })
  }
}
