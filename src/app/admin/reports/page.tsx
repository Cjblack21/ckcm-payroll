"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  FileText, 
  Download, 
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { toast } from "react-hot-toast"
import { SSRSafe } from "@/components/ssr-safe"

type MonthlyReport = {
  month: string
  year: number
  totalEmployees: number
  totalPayroll: number
  totalDeductions: number
  totalLoans: number
  averageSalary: number
  attendanceRate: number
  payrollEntries: number
}

type PayrollSummary = {
  users_id: string
  name: string
  email: string
  personnelType: string
  basicSalary: number
  totalDeductions: number
  totalLoans: number
  netPay: number
  attendanceDays: number
  totalDays: number
  attendanceRate: number
}

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<MonthlyReport | null>(null)
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary[]>([])
  const [showDetailed, setShowDetailed] = useState(false)

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  async function generateReport() {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/reports/monthly?month=${selectedMonth}&year=${selectedYear}`)
      const data = await res.json()
      
      if (res.ok) {
        setReportData(data.summary)
        setPayrollSummary(data.payrollSummary || [])
        toast.success('Monthly report generated successfully')
      } else {
        toast.error(data.error || 'Failed to generate report')
      }
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  async function exportToCSV() {
    if (!reportData || !payrollSummary.length) {
      toast.error('No data to export')
      return
    }

    try {
      const res = await fetch(`/api/admin/reports/export?month=${selectedMonth}&year=${selectedYear}&format=csv`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-report-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  useEffect(() => {
    generateReport()
  }, [])

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between rounded-md px-4 py-3 bg-transparent dark:bg-sidebar text-foreground dark:text-sidebar-foreground">
        <h2 className="text-3xl font-bold tracking-tight">Monthly Reports</h2>
        <div className="flex items-center gap-2">
          <SSRSafe>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SSRSafe>
          <SSRSafe>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SSRSafe>
          <Button onClick={generateReport} disabled={loading}>
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
          {reportData && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  Active personnel
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{reportData.totalPayroll.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Monthly total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{reportData.averageSalary.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Per employee
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.attendanceRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Monthly average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₱{reportData.totalDeductions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All deduction types
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">₱{reportData.totalLoans.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Loan payments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Payroll Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.payrollEntries}</div>
                <p className="text-xs text-muted-foreground">
                  Processed entries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Payroll Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detailed Payroll Summary</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDetailed(!showDetailed)}
                >
                  {showDetailed ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showDetailed ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Personnel Type</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Loans</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollSummary.map((employee) => (
                      <TableRow key={employee.users_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.personnelType}</Badge>
                        </TableCell>
                        <TableCell>₱{employee.basicSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">₱{employee.totalDeductions.toLocaleString()}</TableCell>
                        <TableCell className="text-orange-600">₱{employee.totalLoans.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">₱{employee.netPay.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{employee.attendanceDays}/{employee.totalDays} days</div>
                            <div className="text-muted-foreground">{employee.attendanceRate.toFixed(1)}%</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click "Show Details" to view individual employee payroll data
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!reportData && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Report Generated</h3>
            <p className="text-muted-foreground mb-4">
              Select a month and year, then click "Generate Report" to view monthly payroll data.
            </p>
            <Button onClick={generateReport}>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}










