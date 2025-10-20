"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, DollarSign, FileText, Archive, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'

interface PayrollData {
  currentPayroll: any
  archivedPayrolls: any[]
  periodInfo: {
    current: {
      start: string
      end: string
      releaseTime?: string
    }
  }
  breakdown: {
    otherDeductions: any[]
    attendanceDetails: { date: string; type: string; amount: number }[]
    attendanceDeductionsTotal: number
    databaseDeductionsTotal: number
    loans: any[]
    unpaidLeaves?: { leaveType: string; startDate: string; endDate: string; days: number; amount: number }[]
    unpaidLeaveDeductionTotal?: number
    unpaidLeaveDays?: number
    totalDeductions: number
    totalLoanPayments: number
  }
}

export default function PersonnelPayrollPage() {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null)
  const [timeUntilRelease, setTimeUntilRelease] = useState('')
  const [canRelease, setCanRelease] = useState(false)

  useEffect(() => {
    loadPayrollData()
  }, [])

  const loadPayrollData = async () => {
    try {
      setLoading(true)
      console.log('Loading payroll data...')
      
      const response = await fetch('/api/personnel/payroll', { cache: 'no-store' })
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (response.ok) {
        const payrollData = await response.json()
        console.log('Payroll data received:', payrollData)
        setData(payrollData)
      } else {
        let errorPayload: any = {}
        try {
          const ct = response.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            errorPayload = await response.json()
          } else {
            const text = await response.text()
            errorPayload = { message: text.slice(0, 300) }
          }
        } catch {}
        console.error('Failed to load payroll data:', {
          status: response.status,
          statusText: response.statusText,
          error: errorPayload
        })
        // Show user-friendly error message
        alert(`Failed to load payroll data: ${errorPayload?.error || errorPayload?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error loading payroll data:', error)
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testPayrollAPI = async () => {
    try {
      console.log('Testing payroll API...')
      const response = await fetch('/api/test-payroll')
      const testData = await response.json()
      console.log('Test API response:', testData)
      alert(`Test API Response: ${JSON.stringify(testData, null, 2)}`)
    } catch (error) {
      console.error('Test API error:', error)
      alert(`Test API Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const createTestPayroll = async () => {
    try {
      console.log('Creating test payroll...')
      const response = await fetch('/api/create-test-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      console.log('Create test payroll response:', result)
      
      if (response.ok) {
        alert(`Test payroll created successfully! ${result.message}`)
        // Reload the payroll data
        loadPayrollData()
      } else {
        alert(`Failed to create test payroll: ${result.error}`)
      }
    } catch (error) {
      console.error('Create test payroll error:', error)
      alert(`Error creating test payroll: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const viewDetails = (payroll: any) => {
    setSelectedPayroll(payroll)
    setDetailsOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  // Timer to update countdown every second
  useEffect(() => {
    if (!data?.periodInfo?.current?.end || !data?.periodInfo?.current?.releaseTime) {
      setTimeUntilRelease('')
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const releaseTime = data.periodInfo.current.releaseTime || '17:00'
      const [hours, minutes] = releaseTime.split(':').map(Number)
      
      // Create release date time using period end date
      const releaseDateTime = new Date(data.periodInfo.current.end)
      releaseDateTime.setHours(hours, minutes, 0, 0)
      
      const diff = releaseDateTime.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeUntilRelease('Release available now!')
        if (!canRelease) {
          setCanRelease(true)
        }
        return
      }
      
      // If counting down, ensure canRelease is false
      if (canRelease) {
        setCanRelease(false)
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)
      
      let countdown = ''
      if (days > 0) countdown += `${days}d `
      countdown += `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      
      setTimeUntilRelease(countdown)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [data?.periodInfo?.current?.end, data?.periodInfo?.current?.releaseTime, canRelease])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Failed to load payroll data</p>
          <div className="mt-4 space-x-2">
            <Button onClick={loadPayrollData}>
              Try Again
            </Button>
            <Button onClick={testPayrollAPI} variant="outline">
              Test API
            </Button>
            <Button onClick={createTestPayroll} variant="secondary">
              Create Test Payroll
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { currentPayroll, archivedPayrolls, periodInfo, breakdown } = data

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Payroll</h1>
          <p className="text-gray-600">View your current and archived payroll information</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Archive className="w-4 h-4 mr-2" />
                View Archive
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Payroll Archive</DialogTitle>
                <DialogDescription>
                  View your previous payroll records
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {archivedPayrolls.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No archived payroll records found</p>
                ) : (
                  archivedPayrolls.map((payroll) => (
                    <Card key={payroll.payroll_entries_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Net Pay: {formatCurrency(Number(payroll.netPay))}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={payroll.status === 'RELEASED' ? 'default' : 'secondary'}>
                              {payroll.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewDetails(payroll)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Release Countdown Timer - Only show if payroll exists (was generated) */}
      {!canRelease && currentPayroll && currentPayroll.status !== 'RELEASED' && timeUntilRelease && (
        <Card className="border-2 border-yellow-500 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">Payroll Release Countdown</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  Release available on {formatDate(periodInfo.current.end)}
                  {periodInfo.current.releaseTime && ` at ${periodInfo.current.releaseTime}`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-yellow-700 dark:text-yellow-500 mb-1">Release in:</p>
                <div className="text-4xl font-bold font-mono text-yellow-900 dark:text-yellow-400 tracking-wider">
                  {timeUntilRelease}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Release Ready Banner - Only show if payroll exists (was generated) */}
      {canRelease && currentPayroll && currentPayroll.status !== 'RELEASED' && (
        <Card className="border-2 border-orange-500 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3">
              <div className="text-4xl">✓</div>
              <div>
                <p className="text-lg font-bold text-orange-800 dark:text-orange-400">Payroll Release Available!</p>
                <p className="text-sm text-orange-600 dark:text-orange-500">Your payroll will be released soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Pay Period Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Current Pay Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Period Start</p>
              <p className="font-medium">{formatDate(periodInfo.current.start)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Period End</p>
              <p className="font-medium">{formatDate(periodInfo.current.end)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Payroll */}
      {currentPayroll ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Current Payroll
            </CardTitle>
            <CardDescription>
              Your payroll for the current period
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Summary Cards - Clean Design */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Basic Salary</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(Number(currentPayroll.basicSalary))}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Deductions</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(Number(currentPayroll.deductions))}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
                  <p className="text-xl font-semibold text-primary">
                    {formatCurrency(Number(currentPayroll.netPay))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {((Number(currentPayroll.netPay) / Number(currentPayroll.basicSalary)) * 100).toFixed(1)}% of basic
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Status and Action */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant={currentPayroll.status === 'RELEASED' ? 'default' : 'secondary'}>
                  {currentPayroll.status}
                </Badge>
                {currentPayroll.releasedAt && (
                  <span className="text-sm text-muted-foreground">
                    Released: {formatDate(currentPayroll.releasedAt)}
                  </span>
                )}
              </div>
              <Button onClick={() => viewDetails(currentPayroll)}>
                <FileText className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Current Payroll</h3>
            <p className="text-gray-600">
              No payroll has been generated for the current period yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payroll Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-[1400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Payroll Details
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of your payroll
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayroll && (
            <div className="space-y-6">
              {/* Period Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Pay Period</p>
                  <p className="font-medium">
                    {formatDate(selectedPayroll.periodStart)} - {formatDate(selectedPayroll.periodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant={selectedPayroll.status === 'RELEASED' ? 'default' : 'secondary'}>
                    {selectedPayroll.status}
                  </Badge>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Earnings
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Basic Salary (Biweekly)</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(selectedPayroll.basicSalary))}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-medium">
                      <TableCell>Total Earnings</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(selectedPayroll.basicSalary))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Deductions Breakdown */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  Deductions
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdown.otherDeductions.map((deduction, index) => (
                      <TableRow key={index}>
                        <TableCell>{deduction.deductionType?.name || deduction.type || 'Deduction'}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(deduction.amount ?? deduction.deductionType?.amount ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {breakdown.attendanceDetails.map((item, idx) => (
                      <TableRow key={`attd-${idx}`}>
                        <TableCell>{`Attendance - ${item.type} (${formatDate(item.date)})`}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {(() => {
                      const start = new Date(selectedPayroll.periodStart)
                      const end = new Date(selectedPayroll.periodEnd)
                      const periodDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                      const factor = periodDays <= 16 ? 0.5 : 1.0
                      return breakdown.loans.map((loan, index) => (
                      <TableRow key={`loan-${index}`}>
                        <TableCell>Loan Payment - {loan.purpose}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency((Number(loan.amount) * Number(loan.monthlyPaymentPercent) / 100) * factor)}
                        </TableCell>
                      </TableRow>
                      ))
                    })()}
                    {breakdown.unpaidLeaves && breakdown.unpaidLeaves.length > 0 && breakdown.unpaidLeaves.map((leave, index) => (
                      <TableRow key={`leave-${index}`} className="bg-orange-50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">Unpaid Leave - {leave.leaveType}</span>
                            <span className="text-xs text-gray-600">
                              {formatDate(leave.startDate)} - {formatDate(leave.endDate)} ({leave.days} {leave.days === 1 ? 'day' : 'days'})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(leave.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-medium">Total Attendance Deductions</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(breakdown.attendanceDeductionsTotal))}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Other Deductions</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(breakdown.databaseDeductionsTotal))}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Loan Payments</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(breakdown.totalLoanPayments))}
                      </TableCell>
                    </TableRow>
                    {breakdown.unpaidLeaveDeductionTotal && breakdown.unpaidLeaveDeductionTotal > 0 && (
                      <TableRow className="bg-orange-100">
                        <TableCell className="font-medium text-orange-900">
                          Total Unpaid Leave ({breakdown.unpaidLeaveDays} {breakdown.unpaidLeaveDays === 1 ? 'day' : 'days'})
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-900">
                          {formatCurrency(Number(breakdown.unpaidLeaveDeductionTotal))}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="font-medium">
                      <TableCell>Total Deductions</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(selectedPayroll.deductions))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Net Pay Summary */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Net Pay</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {formatCurrency(Number(selectedPayroll.netPay))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}





