'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, TrendingDown, TrendingUp, Calendar, AlertCircle, DollarSign } from 'lucide-react'
import { formatDateForDisplay } from '@/lib/timezone'
import { Progress } from '@/components/ui/progress'

type AttendanceDetail = {
  date: string
  timeIn: string | null
  timeOut: string | null
  workHours: number
  status: string
  deduction: number
}

type LoanDetail = {
  type: string
  amount: number
  remainingBalance: number
}

type DeductionDetail = {
  type: string
  amount: number
  description: string
}

type PayrollBreakdown = {
  basicSalary: number
  attendanceDeductions: number
  leaveDeductions: number
  loanDeductions: number
  otherDeductions: number
  attendanceDetails: AttendanceDetail[]
  loanDetails: LoanDetail[]
  otherDeductionDetails: DeductionDetail[]
}

type PayrollEntry = {
  users_id: string
  name: string
  email: string
  personnelType?: string
  totalWorkHours: number
  finalNetPay: number
  status: 'Pending' | 'Released' | 'Archived'
  breakdown: PayrollBreakdown
}

type PayrollPeriod = {
  periodStart: string
  periodEnd: string
  type: 'Weekly' | 'Semi-Monthly' | 'Monthly' | 'Custom'
  status?: 'Pending' | 'Released' | 'Archived'
}

interface PayrollBreakdownDialogProps {
  entry: PayrollEntry | null
  currentPeriod: PayrollPeriod | null
  isOpen: boolean
  onClose: () => void
}

export default function PayrollBreakdownDialog({
  entry,
  currentPeriod,
  isOpen,
  onClose
}: PayrollBreakdownDialogProps) {
  if (!entry) return null

  // Format currency - exactly 2 decimal places
  const formatCurrency = (amount: number) => {
    const safeAmount = Number.isFinite(amount) ? amount : 0
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  // Format work hours
  const formatWorkHours = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`
  }

  // Calculate net pay
  const netPay = Number(entry.breakdown.basicSalary) - (
    Number(entry.breakdown.attendanceDeductions) +
    Number(entry.breakdown.leaveDeductions) +
    Number(entry.breakdown.loanDeductions) +
    Number(entry.breakdown.otherDeductions)
  )

  // Calculate deduction percentages for visual breakdown
  const totalDeductions = 
    Number(entry.breakdown.attendanceDeductions) +
    Number(entry.breakdown.leaveDeductions) +
    Number(entry.breakdown.loanDeductions) +
    Number(entry.breakdown.otherDeductions)

  // Build comprehensive deduction breakdown including all types
  const deductionBreakdown = [
    {
      label: 'Attendance Deductions',
      amount: entry.breakdown.attendanceDeductions,
      percentage: totalDeductions > 0 ? (entry.breakdown.attendanceDeductions / totalDeductions) * 100 : 0,
      color: 'bg-red-500',
      description: 'Late, Absent, Partial Day'
    },
    {
      label: 'Leave Deductions',
      amount: entry.breakdown.leaveDeductions,
      percentage: totalDeductions > 0 ? (entry.breakdown.leaveDeductions / totalDeductions) * 100 : 0,
      color: 'bg-orange-500',
      description: 'Unpaid Leave'
    },
    {
      label: 'Loans',
      amount: entry.breakdown.loanDeductions,
      percentage: totalDeductions > 0 ? (entry.breakdown.loanDeductions / totalDeductions) * 100 : 0,
      color: 'bg-yellow-500',
      description: 'Active Loan Payments'
    },
    // Add individual other deductions as separate items
    ...entry.breakdown.otherDeductionDetails.map((deduction) => ({
      label: deduction.type,
      amount: deduction.amount,
      percentage: totalDeductions > 0 ? (deduction.amount / totalDeductions) * 100 : 0,
      color: deduction.type.toLowerCase().includes('sss') ? 'bg-blue-500' :
             deduction.type.toLowerCase().includes('philhealth') ? 'bg-green-500' :
             deduction.type.toLowerCase().includes('pagibig') || deduction.type.toLowerCase().includes('pag-ibig') ? 'bg-teal-500' :
             deduction.type.toLowerCase().includes('tax') ? 'bg-purple-500' :
             'bg-gray-500',
      description: deduction.description
    }))
  ].filter(item => item.amount > 0)

  // Calculate net pay percentage
  const netPayPercentage = entry.breakdown.basicSalary > 0 
    ? (netPay / entry.breakdown.basicSalary) * 100 
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[99vw] !max-w-none max-h-[95vh] overflow-y-auto scrollbar-hide p-0" style={{maxWidth: 'none', width: '99vw'}}>
        {/* Header Section with Background */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {entry.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentPeriod ? 
                    `${formatDateForDisplay(new Date(currentPeriod.periodStart))} - ${formatDateForDisplay(new Date(currentPeriod.periodEnd))}` :
                    'N/A'
                  } • User ID: {entry.users_id} • {entry.personnelType}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-4 py-2">
                  {entry.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Summary Cards - Larger Design */}
          <div className="grid grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Basic Salary</p>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold">
                  {formatCurrency(entry.breakdown.basicSalary)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Deductions</p>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totalDeductions)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Work Hours</p>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold">
                  {formatWorkHours(entry.totalWorkHours)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Net Pay</p>
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    ₱
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(netPay)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{netPayPercentage.toFixed(1)}% of basic salary</p>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Column - Deductions */}
            <div className="space-y-6">
              {totalDeductions > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Deduction Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {deductionBreakdown.map((item, index) => (
                      <div key={index} className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{item.label}</p>
                          <span className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(item.amount)}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Salary Calculation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Salary Calculation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <span className="font-medium">Basic Salary</span>
                    <span className="text-lg font-bold">{formatCurrency(entry.breakdown.basicSalary)}</span>
                  </div>
                  
                  {entry.breakdown.attendanceDeductions > 0 && (
                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Attendance Deductions</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(entry.breakdown.attendanceDeductions)}</span>
                    </div>
                  )}

                  {entry.breakdown.leaveDeductions > 0 && (
                    <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Leave Deductions</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(entry.breakdown.leaveDeductions)}</span>
                    </div>
                  )}

                  {entry.breakdown.loanDeductions > 0 && (
                    <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Loan Deductions</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(entry.breakdown.loanDeductions)}</span>
                    </div>
                  )}

                  {entry.breakdown.otherDeductions > 0 && (
                    <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">Other Deductions</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(entry.breakdown.otherDeductions)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary mt-4">
                    <span className="text-lg font-bold">Net Pay</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(netPay)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Details */}
          {entry.breakdown.attendanceDetails.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Attendance Details
                  </CardTitle>
                  <Badge variant="secondary">
                    {entry.breakdown.attendanceDetails.length} days
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Deduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.breakdown.attendanceDetails.map((detail, index) => (
                        <TableRow key={index} className={detail.deduction > 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <TableCell className="font-medium">
                            {formatDateForDisplay(new Date(detail.date))}
                          </TableCell>
                          <TableCell>
                            {detail.timeIn ? new Date(detail.timeIn).toLocaleTimeString('en-US', { 
                              timeZone: 'Asia/Manila',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </TableCell>
                          <TableCell>
                            {detail.timeOut ? new Date(detail.timeOut).toLocaleTimeString('en-US', { 
                              timeZone: 'Asia/Manila',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </TableCell>
                          <TableCell>{formatWorkHours(detail.workHours)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                detail.status === 'PRESENT' ? 'default' : 
                                detail.status === 'LATE' ? 'secondary' : 
                                'destructive'
                              }
                            >
                              {detail.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {detail.deduction > 0 ? (
                              <span className="text-red-600 dark:text-red-400 font-semibold">
                                -{formatCurrency(detail.deduction)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loan Details */}
          {entry.breakdown.loanDetails.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Loan Details
                  </CardTitle>
                  <Badge variant="secondary">
                    {entry.breakdown.loanDetails.length} loan(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan Type</TableHead>
                        <TableHead className="text-right">Payment Amount</TableHead>
                        <TableHead className="text-right">Remaining Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.breakdown.loanDetails.map((loan, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{loan.type}</TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400 font-semibold">
                            -{formatCurrency(loan.amount)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(loan.remainingBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Deductions */}
          {entry.breakdown.otherDeductionDetails.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Other Deductions
                  </CardTitle>
                  <Badge variant="secondary">
                    {entry.breakdown.otherDeductionDetails.length} item(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.breakdown.otherDeductionDetails.map((deduction, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{deduction.type}</TableCell>
                          <TableCell className="text-muted-foreground">{deduction.description}</TableCell>
                          <TableCell className="text-right text-red-600 dark:text-red-400 font-semibold">
                            -{formatCurrency(deduction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
