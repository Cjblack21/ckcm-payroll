import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Register fonts for better typography
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 300,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 700,
    },
  ],
})

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontSize: 8,
    fontFamily: 'Roboto',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    height: '100%',
    width: '100%',
  },
  payslipContainer: {
    width: 306, // 4.25 inches in points (4.25 * 72 = 306)
    height: 312, // 4.33 inches in points (4.33 * 72 = 312)
    border: '1pt solid #000000',
    marginBottom: 0,
    marginRight: 0,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    borderBottom: '1pt solid #000000',
    paddingBottom: 4,
    marginBottom: 6,
    textAlign: 'center',
  },
  logo: {
    width: 20,
    height: 20,
    marginBottom: 2,
    alignSelf: 'center',
  },
  schoolName: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 1,
    textAlign: 'center',
  },
  schoolAddress: {
    fontSize: 6,
    color: '#666666',
    marginBottom: 1,
    textAlign: 'center',
  },
  systemName: {
    fontSize: 6,
    color: '#666666',
    marginBottom: 1,
    textAlign: 'center',
  },
  customText: {
    fontSize: 6,
    color: '#666666',
    marginBottom: 1,
    textAlign: 'center',
  },
  payslipTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
    borderTop: '1pt solid #CCCCCC',
    paddingTop: 2,
  },
  employeeInfo: {
    marginBottom: 4,
  },
  employeeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  value: {
    flex: 1,
  },
  payrollSection: {
    borderTop: '1pt solid #CCCCCC',
    paddingTop: 4,
    marginTop: 4,
    flex: 1,
  },
  payrollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  payrollLabel: {
    fontSize: 7,
  },
  payrollValue: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  grossPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    borderTop: '1pt solid #CCCCCC',
    paddingTop: 1,
  },
  totalDeductionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    borderTop: '1pt solid #CCCCCC',
    paddingTop: 1,
  },
  netPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTop: '2pt solid #000000',
    paddingTop: 2,
    fontWeight: 'bold',
    fontSize: 9,
  },
  status: {
    textAlign: 'center',
    fontSize: 6,
    color: '#666666',
    marginTop: 4,
  },
  pageBreak: {
    marginBottom: 20,
  },
})

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
    unpaidLeaveDeduction?: number
    unpaidLeaveDays?: number
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

interface PayslipProps {
  employee: PayslipData
  period: { periodStart: string; periodEnd: string }
  headerSettings: HeaderSettings | null
}

const Payslip: React.FC<PayslipProps> = ({ employee, period, headerSettings }) => {
  const breakdown = employee.breakdown

  return (
    <View style={styles.payslipContainer}>
      {/* Header Section */}
      <View style={styles.header}>
        {headerSettings?.showLogo && (
          <Image style={styles.logo} src={headerSettings.logoUrl} />
        )}
        <Text style={styles.schoolName}>{headerSettings?.schoolName || 'PAYSLIP'}</Text>
        {headerSettings?.schoolAddress && (
          <Text style={styles.schoolAddress}>{headerSettings.schoolAddress}</Text>
        )}
        {headerSettings?.systemName && (
          <Text style={styles.systemName}>{headerSettings.systemName}</Text>
        )}
        {headerSettings?.customText && (
          <Text style={styles.customText}>{headerSettings.customText}</Text>
        )}
        <Text style={styles.payslipTitle}>PAYSLIP</Text>
      </View>

      {/* Employee Information */}
      <View style={styles.employeeInfo}>
        <View style={styles.employeeRow}>
          <Text style={styles.label}>Employee:</Text>
          <Text style={styles.value}>{employee.name || employee.email}</Text>
        </View>
        <View style={styles.employeeRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{employee.email}</Text>
        </View>
        <View style={styles.employeeRow}>
          <Text style={styles.label}>Period:</Text>
          <Text style={styles.value}>
            {new Date(period.periodStart).toLocaleDateString()} - {new Date(period.periodEnd).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Payroll Details */}
      <View style={styles.payrollSection}>
        <View style={styles.payrollRow}>
          <Text style={styles.payrollLabel}>Work Hours:</Text>
          <Text style={styles.payrollValue}>{employee.totalHours.toFixed(2)} hrs</Text>
        </View>
        
        {breakdown && (
          <>
            <View style={styles.payrollRow}>
              <Text style={styles.payrollLabel}>Basic:</Text>
              <Text style={styles.payrollValue}>
                ₱{(breakdown.biweeklyBasicSalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.payrollRow}>
              <Text style={styles.payrollLabel}>OT:</Text>
              <Text style={styles.payrollValue}>
                ₱{(breakdown.overtimePay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.grossPayRow}>
              <Text style={styles.payrollLabel}>Gross:</Text>
              <Text style={styles.payrollValue}>
                ₱{(breakdown.grossPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.payrollRow}>
              <Text style={styles.payrollLabel}>Att. Ded:</Text>
              <Text style={styles.payrollValue}>
                -₱{(breakdown.attendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.payrollRow}>
              <Text style={styles.payrollLabel}>Other Ded:</Text>
              <Text style={styles.payrollValue}>
                -₱{(breakdown.nonAttendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
            {breakdown.unpaidLeaveDeduction && breakdown.unpaidLeaveDeduction > 0 && (
              <View style={styles.payrollRow}>
                <Text style={styles.payrollLabel}>Unpaid Leave ({breakdown.unpaidLeaveDays}d):</Text>
                <Text style={styles.payrollValue}>
                  -₱{(breakdown.unpaidLeaveDeduction || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}
            <View style={styles.payrollRow}>
              <Text style={styles.payrollLabel}>Loans:</Text>
              <Text style={styles.payrollValue}>
                -₱{(breakdown.loanPayments || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
            {breakdown.deductionDetails && breakdown.deductionDetails.length > 0 && (
              <View style={{ marginTop: 2, paddingTop: 2, borderTop: '1pt solid #eee' }}>
                <Text style={{ fontSize: 5, fontWeight: 'bold', marginBottom: 1 }}>Deduction Details:</Text>
                {breakdown.deductionDetails.map((deduction: any, index: number) => (
                  <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0.5 }}>
                    <Text style={{ fontSize: 5, maxWidth: '60%' }}>
                      {deduction.type}:
                    </Text>
                    <Text style={{ fontSize: 5 }}>
                      -₱{deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.totalDeductionsRow}>
              <Text style={styles.payrollLabel}>Total Ded:</Text>
              <Text style={styles.payrollValue}>
                -₱{(breakdown.totalDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
          </>
        )}
        
        <View style={styles.netPayRow}>
          <Text>NET PAY:</Text>
          <Text>₱{employee.totalSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
        </View>
      </View>

      {/* Status */}
      <Text style={styles.status}>
        Status: {employee.released ? 'RELEASED' : 'PENDING'}
      </Text>
    </View>
  )
}

interface PayslipsDocumentProps {
  employees: PayslipData[]
  period: { periodStart: string; periodEnd: string }
  headerSettings: HeaderSettings | null
}

export const PayslipsDocument: React.FC<PayslipsDocumentProps> = ({ 
  employees, 
  period, 
  headerSettings 
}) => {
  // Group employees into pages of 6
  const employeesPerPage = 6
  const pages = []
  for (let i = 0; i < employees.length; i += employeesPerPage) {
    pages.push(employees.slice(i, i + employeesPerPage))
  }

  return (
    <Document>
      {pages.map((pageEmployees, pageIndex) => (
        <Page 
          key={pageIndex} 
          size={{ width: 612, height: 936 }} // 8.5" x 13" in points (72 DPI)
          style={styles.page}
        >
          <View style={styles.gridContainer}>
            {pageEmployees.map((employee, index) => (
              <Payslip
                key={employee.users_id}
                employee={employee}
                period={period}
                headerSettings={headerSettings}
              />
            ))}
          </View>
        </Page>
      ))}
    </Document>
  )
}
