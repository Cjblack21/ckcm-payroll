"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { Eye, Calendar, Users, Banknote, ArrowLeft, Clock, FileText, Printer, Archive } from "lucide-react"
import { generatePayslipsHTML, PayslipData, HeaderSettings } from "@/lib/payslip-generator"

type PayrollDetail = {
  payroll_entries_id: string
  users_id: string
  userName: string | null
  userEmail: string
  periodStart: string
  periodEnd: string
  basicSalary: number
  overtime: number
  deductions: number
  netPay: number
  releasedAt: string | null
  processedAt: string
  breakdown?: {
    basicSalary: number
    overtime: number
    grossPay: number
    totalDeductions: number
    netPay: number
    attendanceDetails: Array<{
      date: string
      timeIn: string | null
      timeOut: string | null
      status: string
      workHours: number
    }>
    attendanceDeductionDetails: Array<{
      date: string
      amount: number
      description: string
    }>
    totalAttendanceDeductions: number
    loanDetails: Array<{
      type: string
      amount: number
      description: string
    }>
    otherDeductionDetails: Array<{
      type: string
      amount: number
      description: string
    }>
    personnelType: string
    personnelBasicSalary: number
  }
}

type DateGroup = {
  date: string
  totalEmployees: number
  totalNetPay: number
  payrolls: PayrollDetail[]
}

type ViewState = 'dates' | 'users' | 'details'

type ArchivedLoan = {
  loans_id: string
  users_id: string
  userName: string | null
  userEmail: string
  department: string | null
  amount: number
  balance: number
  monthlyPaymentPercent: number
  termMonths: number
  status: string
  purpose: string | null
  createdAt: string
  archivedAt: string | null
}

type PayrollArchive = {
  id: string
  periodStart: string
  periodEnd: string
  totalEmployees: number
  totalExpenses: number
  totalDeductions: number
  totalAttendanceDeductions: number
  totalDatabaseDeductions: number
  totalLoanPayments: number
  totalGrossSalary: number
  totalNetPay: number
  releasedAt: string
  releasedBy: string
  payrolls: any[]
}

// Helper function to safely format dates
function safeFormatDate(dateString: string | null | undefined, formatString: string, fallback: string = 'Invalid date'): string {
  if (!dateString) return fallback
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return fallback
    return format(date, formatString)
  } catch (error) {
    return fallback
  }
}

export default function ArchivePage() {
  const [groupedItems, setGroupedItems] = useState<DateGroup[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [viewState, setViewState] = useState<ViewState>('dates')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDetail | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'payroll' | 'loans'>('overview')
  const [payrollArchives, setPayrollArchives] = useState<PayrollArchive[]>([])
  const [archivedLoans, setArchivedLoans] = useState<ArchivedLoan[]>([])

  useEffect(() => {
    loadArchive()
  }, [])

  async function loadArchive() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/archive')
      
      if (!res.ok) {
        console.error('Archive API error:', res.status, res.statusText)
        const errorData = await res.json().catch(() => ({}))
        console.error('Error details:', errorData)
        setPayrollArchives([])
        setArchivedLoans([])
        return
      }
      
      const data = await res.json()
      console.log('Archive API response:', data)
      console.log('Payroll archives:', data.payrolls)
      console.log('Loan archives:', data.loans)
      setPayrollArchives(data.payrolls || [])
      setArchivedLoans(data.loans || [])
    } catch (e) {
      console.error('Error loading archive', e)
      setPayrollArchives([])
      setArchivedLoans([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPayrollArchives = useMemo(() => {
    if (!search) return payrollArchives
    const q = search.toLowerCase()
    return payrollArchives.filter(archive => 
      archive.periodStart.toLowerCase().includes(q) ||
      archive.periodEnd.toLowerCase().includes(q) ||
      archive.payrolls.some((p: any) => 
        (p.user?.name || '').toLowerCase().includes(q) ||
        (p.user?.email || '').toLowerCase().includes(q)
      )
    )
  }, [payrollArchives, search])

  const filteredLoans = useMemo(() => {
    if (!search) return archivedLoans
    const q = search.toLowerCase()
    return archivedLoans.filter(loan => 
      (loan.userName || '').toLowerCase().includes(q) ||
      loan.userEmail.toLowerCase().includes(q) ||
      (loan.department || '').toLowerCase().includes(q)
    )
  }, [archivedLoans, search])

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const totalPayrollPeriods = payrollArchives.length
    const totalPayrollAmount = payrollArchives.reduce((sum, p) => sum + p.totalNetPay, 0)
    const totalEmployeesInPayroll = payrollArchives.reduce((sum, p) => sum + p.totalEmployees, 0)
    const totalLoans = archivedLoans.length
    const totalLoanAmount = archivedLoans.reduce((sum, l) => sum + l.amount, 0)
    const totalLoanBalance = archivedLoans.reduce((sum, l) => sum + l.balance, 0)
    
    return {
      totalPayrollPeriods,
      totalPayrollAmount,
      totalEmployeesInPayroll,
      totalLoans,
      totalLoanAmount,
      totalLoanBalance
    }
  }, [payrollArchives, archivedLoans])

  function handleViewPayrollPeriod(archive: PayrollArchive) {
    // Convert PayrollArchive to DateGroup format for compatibility
    const dateGroup: DateGroup = {
      date: archive.periodStart,
      totalEmployees: archive.totalEmployees,
      totalNetPay: archive.totalNetPay,
      payrolls: archive.payrolls.map((p: any) => ({
        payroll_entries_id: p.payroll_entries_id,
        users_id: p.users_id,
        userName: p.user?.name || null,
        userEmail: p.user?.email || '',
        periodStart: archive.periodStart,
        periodEnd: archive.periodEnd,
        basicSalary: Number(p.basicSalary),
        overtime: Number(p.overtime),
        deductions: Number(p.deductions),
        netPay: Number(p.netPay),
        releasedAt: p.releasedAt,
        processedAt: p.processedAt
      }))
    }
    setSelectedDate(archive.periodStart)
    setViewState('users')
    setSearch('')
  }

  function handleViewPayroll(payroll: PayrollDetail) {
    setSelectedPayroll(payroll)
    setViewState('details')
  }

  function handleBackToDates() {
    setViewState('dates')
    setSelectedDate(null)
    setSearch('')
  }

  function handleBackToUsers() {
    setViewState('users')
    setSelectedPayroll(null)
  }

  // Fetch header settings from API
  async function fetchHeaderSettings(): Promise<HeaderSettings | null> {
    try {
      const response = await fetch('/api/admin/header-settings')
      if (response.ok) {
        const settings = await response.json()
        return settings
      }
      return null
    } catch (error) {
      console.error('Error fetching header settings:', error)
      return null
    }
  }

  // Print functions
  async function printDateGroupPayrolls(dateGroup: DateGroup) {
    try {
      // Use the screenshot route which has proper layout
      const response = await fetch('/api/admin/payroll/print-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodStart: dateGroup.payrolls[0]?.periodStart || '',
          periodEnd: dateGroup.payrolls[0]?.periodEnd || ''
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Screenshot route error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to generate payslips')
      }

      // Get the HTML content from the response
      const htmlContent = await response.text()
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
      
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
    } catch (error) {
      console.error('Error generating payslips:', error)
      alert('Failed to generate payslips. Please try again.')
    }
  }

  async function printIndividualPayroll(payroll: PayrollDetail) {
    try {
      // Use the screenshot route which has proper layout
      const response = await fetch('/api/admin/payroll/print-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodStart: payroll.periodStart,
          periodEnd: payroll.periodEnd
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Screenshot route error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to generate payslip')
      }

      // Get the HTML content from the response
      const htmlContent = await response.text()
      
      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
      
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
      }
    } catch (error) {
      console.error('Error generating payslip:', error)
      alert('Failed to generate payslip. Please try again.')
    }
  }

  // Get selected archive for detail view
  const selectedArchive = payrollArchives.find(a => a.periodStart === selectedDate)
  const selectedDateGroup: DateGroup | undefined = selectedArchive ? {
    date: selectedArchive.periodStart,
    totalEmployees: selectedArchive.totalEmployees,
    totalNetPay: selectedArchive.totalNetPay,
    payrolls: selectedArchive.payrolls.map((p: any) => ({
      payroll_entries_id: p.payroll_entries_id,
      users_id: p.users_id,
      userName: p.user?.name || null,
      userEmail: p.user?.email || '',
      periodStart: selectedArchive.periodStart,
      periodEnd: selectedArchive.periodEnd,
      basicSalary: Number(p.basicSalary),
      overtime: Number(p.overtime),
      deductions: Number(p.deductions),
      netPay: Number(p.netPay),
      releasedAt: p.releasedAt,
      processedAt: p.processedAt
    }))
  } : undefined

  const filteredUsers = useMemo(() => {
    if (!selectedDateGroup) return []
    const q = search.toLowerCase()
    return selectedDateGroup.payrolls.filter(p => 
      (p.userName || '').toLowerCase().includes(q) ||
      p.userEmail.toLowerCase().includes(q)
    )
  }, [selectedDateGroup, search])

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {viewState !== 'dates' && (
            <Button variant="outline" onClick={viewState === 'users' ? handleBackToDates : handleBackToUsers}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Archive className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              Archive
            </h2>
            <p className="text-muted-foreground">
              {activeTab === 'overview' && 'Overview of archived payrolls and loans'}
              {activeTab === 'payroll' && viewState === 'dates' && 'Select a period to view payroll details'}
              {activeTab === 'payroll' && viewState === 'users' && `Payrolls for period ${safeFormatDate(selectedDate, 'MMM dd', 'Unknown')} - ${safeFormatDate(selectedArchive?.periodEnd || '', 'MMM dd, yyyy', 'Unknown')}`}
              {activeTab === 'payroll' && viewState === 'details' && `Payroll breakdown for ${selectedPayroll?.userName || selectedPayroll?.userEmail}`}
              {activeTab === 'loans' && 'View all archived loans'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-64" 
          />
          {search && <Button variant="outline" onClick={() => setSearch("")}>Clear</Button>}
        </div>
      </div>

      {/* Tab Navigation */}
      {viewState === 'dates' && (
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('overview')}
            className="rounded-b-none"
          >
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'payroll' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('payroll')}
            className="rounded-b-none"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Payroll Archives
          </Button>
          <Button
            variant={activeTab === 'loans' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('loans')}
            className="rounded-b-none"
          >
            <Banknote className="h-4 w-4 mr-2" />
            Loan Archives
          </Button>
        </div>
      )}

      {/* Overview Tab */}
      {viewState === 'dates' && activeTab === 'overview' && (
        <div className="grid gap-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payroll Periods</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.totalPayrollPeriods}</div>
                <p className="text-xs text-muted-foreground">
                  Archived periods
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payroll Amount</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{overviewStats.totalPayrollAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Net pay distributed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees Processed</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.totalEmployeesInPayroll}</div>
                <p className="text-xs text-muted-foreground">
                  Total payroll entries
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Archived Loans</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.totalLoans}</div>
                <p className="text-xs text-muted-foreground">
                  Total archived loans
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Loan Amount</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{overviewStats.totalLoanAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Original loan amounts
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{overviewStats.totalLoanBalance.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Outstanding loan balance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payroll Periods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Payroll Periods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payrollArchives.slice(0, 5).map((archive) => (
                  <div key={archive.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">
                        {safeFormatDate(archive.periodStart, 'MMM dd', 'Invalid')} — {safeFormatDate(archive.periodEnd, 'MMM dd, yyyy', 'Invalid')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {archive.totalEmployees} employees • ₱{archive.totalNetPay.toLocaleString()} net pay
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      setActiveTab('payroll')
                      handleViewPayrollPeriod(archive)
                    }}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
                {payrollArchives.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No archived payrolls found.'}
                  </div>
                )}
                {payrollArchives.length > 5 && (
                  <Button variant="link" onClick={() => setActiveTab('payroll')} className="w-full">
                    View all {payrollArchives.length} periods →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Archived Loans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Recent Archived Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {archivedLoans.slice(0, 5).map((loan) => (
                  <div key={loan.loans_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{loan.userName || loan.userEmail}</p>
                      <p className="text-sm text-muted-foreground">
                        ₱{loan.amount.toLocaleString()} • Balance: ₱{loan.balance.toLocaleString()} • {loan.status}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {safeFormatDate(loan.archivedAt, 'MMM dd, yyyy', 'Unknown')}
                    </span>
                  </div>
                ))}
                {archivedLoans.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading...' : 'No archived loans found.'}
                  </div>
                )}
                {archivedLoans.length > 5 && (
                  <Button variant="link" onClick={() => setActiveTab('loans')} className="w-full">
                    View all {archivedLoans.length} loans →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Archives Tab */}
      {viewState === 'dates' && activeTab === 'payroll' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payroll Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPayrollArchives.map((archive) => (
                <div key={archive.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {safeFormatDate(archive.periodStart, 'MMM dd', 'Invalid')} — {safeFormatDate(archive.periodEnd, 'MMM dd, yyyy', 'Invalid')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Released by {archive.releasedBy} on {safeFormatDate(archive.releasedAt, 'MMM dd, yyyy', 'Unknown')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{archive.totalEmployees} employees</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Banknote className="h-4 w-4" />
                          <span>₱{archive.totalNetPay.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleViewPayrollPeriod(archive)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPayrollArchives.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No archived payrolls found.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users View */}
      {viewState === 'users' && selectedDateGroup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employees - {safeFormatDate(selectedDate, 'MMMM dd, yyyy', 'Unknown Date')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((payroll) => (
                  <TableRow key={payroll.payroll_entries_id}>
                    <TableCell className="font-medium">
                      {payroll.userName || payroll.userEmail}
                    </TableCell>
                    <TableCell>{payroll.userEmail}</TableCell>
                    <TableCell>
                      {safeFormatDate(payroll.periodStart, 'MMM dd', 'Invalid')} — {safeFormatDate(payroll.periodEnd, 'MMM dd, yyyy', 'Invalid')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{payroll.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewPayroll(payroll)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Breakdown
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => printIndividualPayroll(payroll)}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No employees found for this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Loans Tab */}
      {viewState === 'dates' && activeTab === 'loans' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Archived Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Monthly %</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Archived Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow key={loan.loans_id}>
                    <TableCell className="font-medium">
                      {loan.userName || loan.userEmail}
                    </TableCell>
                    <TableCell>{loan.userEmail}</TableCell>
                    <TableCell>{loan.department || 'N/A'}</TableCell>
                    <TableCell className="text-right">₱{loan.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₱{loan.balance.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{loan.monthlyPaymentPercent}%</TableCell>
                    <TableCell>{loan.termMonths} months</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        loan.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {loan.status}
                      </span>
                    </TableCell>
                    <TableCell>{safeFormatDate(loan.archivedAt, 'MMM dd, yyyy', 'Invalid')}</TableCell>
                  </TableRow>
                ))}
                {filteredLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Loading archived loans...' : 'No archived loans found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payroll Details Dialog */}
      <Dialog open={viewState === 'details'} onOpenChange={(open) => !open && handleBackToUsers()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Payroll Breakdown
              </div>
              {selectedPayroll && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => printIndividualPayroll(selectedPayroll)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Detailed payroll information for {selectedPayroll?.userName || selectedPayroll?.userEmail}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayroll && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Employee</h4>
                  <p className="text-lg font-semibold">{selectedPayroll.userName || selectedPayroll.userEmail}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayroll.userEmail}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Pay Period</h4>
                  <p className="text-lg font-semibold">
                    {safeFormatDate(selectedPayroll.periodStart, 'MMM dd, yyyy', 'Invalid')} — {safeFormatDate(selectedPayroll.periodEnd, 'MMM dd, yyyy', 'Invalid')}
                  </p>
                </div>
              </div>

              {/* Payroll Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Earnings</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Basic Salary:</span>
                      <span className="font-medium">₱{selectedPayroll.basicSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overtime:</span>
                      <span className="font-medium">₱{selectedPayroll.overtime.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Gross Pay:</span>
                        <span>₱{(selectedPayroll.basicSalary + selectedPayroll.overtime).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Deductions</h4>
                  <div className="space-y-2">
                    {selectedPayroll.breakdown && selectedPayroll.breakdown.totalAttendanceDeductions && selectedPayroll.breakdown.totalAttendanceDeductions > 0 && (
                      <div className="flex justify-between">
                        <span>Attendance Deductions:</span>
                        <span className="font-medium text-red-600">-₱{selectedPayroll.breakdown.totalAttendanceDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {selectedPayroll.breakdown && selectedPayroll.breakdown.loanDetails && Array.isArray(selectedPayroll.breakdown.loanDetails) && selectedPayroll.breakdown.loanDetails.length > 0 && (
                      <div className="flex justify-between">
                        <span>Loan Deductions:</span>
                        <span className="font-medium text-red-600">-₱{selectedPayroll.breakdown.loanDetails.reduce((sum, loan) => sum + (loan?.amount || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {selectedPayroll.breakdown && selectedPayroll.breakdown.otherDeductionDetails && Array.isArray(selectedPayroll.breakdown.otherDeductionDetails) && selectedPayroll.breakdown.otherDeductionDetails.length > 0 && (
                      <div className="flex justify-between">
                        <span>Other Deductions:</span>
                        <span className="font-medium text-red-600">-₱{selectedPayroll.breakdown.otherDeductionDetails.reduce((sum, deduction) => sum + (deduction?.amount || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Total Deductions:</span>
                      <span className="font-medium text-red-600">-₱{selectedPayroll.deductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Net Pay:</span>
                        <span className="text-green-600">₱{selectedPayroll.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              {selectedPayroll.breakdown && (
                <div className="space-y-6">
                  {/* Attendance Details */}
                  {selectedPayroll.breakdown.attendanceDetails && Array.isArray(selectedPayroll.breakdown.attendanceDetails) && selectedPayroll.breakdown.attendanceDetails.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Attendance Details</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Time In</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Time Out</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Status</th>
                              <th className="border border-gray-300 px-3 py-2 text-left">Work Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPayroll.breakdown.attendanceDetails.map((attendance, index) => (
                              <tr key={index}>
                                <td className="border border-gray-300 px-3 py-2">{safeFormatDate(attendance.date, 'MMM dd, yyyy', 'Invalid')}</td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {attendance.timeIn ? safeFormatDate(attendance.timeIn, 'HH:mm', 'N/A') : 'N/A'}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  {attendance.timeOut ? safeFormatDate(attendance.timeOut, 'HH:mm', 'N/A') : 'N/A'}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    attendance.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                                    attendance.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                                    attendance.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {attendance.status}
                                  </span>
                                </td>
                                <td className="border border-gray-300 px-3 py-2">{attendance.workHours.toFixed(2)} hrs</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Attendance Deduction Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Attendance Deductions</h4>
                    {selectedPayroll.breakdown?.attendanceDeductionDetails && Array.isArray(selectedPayroll.breakdown.attendanceDeductionDetails) && selectedPayroll.breakdown.attendanceDeductionDetails.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPayroll.breakdown.attendanceDeductionDetails.map((deduction, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded border-l-4 border-red-400">
                            <div>
                              <span className="font-medium text-red-800">{deduction.description}</span>
                              <p className="text-sm text-red-600">{safeFormatDate(deduction.date, 'MMM dd, yyyy', 'Invalid date')}</p>
                            </div>
                            <span className="font-medium text-red-600">-₱{deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-3">
                          <div className="flex justify-between font-semibold text-lg">
                            <span>Total Attendance Deductions:</span>
                            <span className="text-red-600">-₱{selectedPayroll.breakdown.totalAttendanceDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded border">
                        <p className="text-gray-600 text-sm">
                          No attendance deductions for this period.
                          {selectedPayroll.breakdown?.totalAttendanceDeductions !== undefined && (
                            <span className="block mt-1">
                              Total calculated: ₱{selectedPayroll.breakdown.totalAttendanceDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Loan Details */}
                  {selectedPayroll.breakdown.loanDetails && Array.isArray(selectedPayroll.breakdown.loanDetails) && selectedPayroll.breakdown.loanDetails.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Loan Deductions</h4>
                      <div className="space-y-2">
                        {selectedPayroll.breakdown.loanDetails.map((loan, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{loan.type}</span>
                              <p className="text-sm text-gray-600">{loan.description}</p>
                            </div>
                            <span className="font-medium text-red-600">-₱{loan.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Deductions */}
                  {selectedPayroll.breakdown.otherDeductionDetails && Array.isArray(selectedPayroll.breakdown.otherDeductionDetails) && selectedPayroll.breakdown.otherDeductionDetails.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Other Deductions</h4>
                      <div className="space-y-2">
                        {selectedPayroll.breakdown.otherDeductionDetails.map((deduction, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{deduction.type}</span>
                              <p className="text-sm text-gray-600">{deduction.description}</p>
                            </div>
                            <span className="font-medium text-red-600">-₱{deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Processed</p>
                    <p className="font-medium">
                      {safeFormatDate(selectedPayroll.processedAt, 'MMM dd, yyyy HH:mm', 'Invalid date')}
                    </p>
                  </div>
                </div>
                {selectedPayroll.releasedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Released</p>
                      <p className="font-medium">
                        {safeFormatDate(selectedPayroll.releasedAt, 'MMM dd, yyyy HH:mm', 'Invalid date')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}












