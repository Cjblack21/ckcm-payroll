"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, FileText, Archive, Clock } from 'lucide-react'
import { format } from 'date-fns'
import PayrollBreakdownDialog from '@/components/payroll/PayrollBreakdownDialog'

interface PayrollData {
  currentPayroll: any
  archivedPayrolls: any[]
  periodInfo: {
    current: {
      start: string
      end: string
      releaseTime?: string
      scheduledRelease?: string
    }
  }
  breakdown: {
    otherDeductions: any[]
    attendanceDetails: { date: string; type: string; amount: number }[]
    attendanceDeductionsTotal: number
    databaseDeductionsTotal: number
    loans: any[]
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
  const [selectedBreakdown, setSelectedBreakdown] = useState<any>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)
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
        console.log('📅 Period Info:', {
          start: payrollData.periodInfo?.current?.start,
          end: payrollData.periodInfo?.current?.end,
          releaseTime: payrollData.periodInfo?.current?.releaseTime,
          scheduledRelease: payrollData.periodInfo?.current?.scheduledRelease
        })
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

  const viewDetails = async (payroll: any) => {
    console.log('👁️ View details clicked for payroll:', payroll)
    setSelectedPayroll(payroll)
    setSelectedBreakdown(null)
    setDetailsOpen(true)
    
    // Fetch breakdown with the payroll data directly
    await fetchBreakdownForPayroll(payroll)
  }
  
  const fetchBreakdownForPayroll = async (payroll: any) => {
    setLoadingBreakdown(true)
    
    try {
      // SIMPLE - Use the data that's already in the table (it's correct!)
      const snapshot = payroll.breakdownSnapshot
      const monthlyBasic = payroll.user?.personnelType?.basicSalary || 20000
      const periodSalary = monthlyBasic / 2
      const overload = snapshot?.totalAdditions || 0
      const deductions = payroll.deductions || 0
      
      setSelectedBreakdown({
        basicSalary: periodSalary,
        monthlyBasicSalary: monthlyBasic,
        attendanceDeductions: 0,
        leaveDeductions: 0,
        loanDeductions: 0,
        otherDeductions: deductions,
        overloadPay: overload,
        attendanceDetails: [],
        loanDetails: [],
        otherDeductionDetails: []
      })
    } catch (error) {
      console.error('Error:', error)
      setSelectedBreakdown({
        basicSalary: 10000,
        monthlyBasicSalary: 20000,
        attendanceDeductions: 0,
        leaveDeductions: 0,
        loanDeductions: 0,
        otherDeductions: 0,
        overloadPay: 0,
        attendanceDetails: [],
        loanDetails: [],
        otherDeductionDetails: []
      })
    } finally {
      setLoadingBreakdown(false)
    }
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
    if (!data?.periodInfo?.current?.end) {
      setTimeUntilRelease('')
      setCanRelease(false)
      return
    }

    const updateCountdown = () => {
      // Get current time in Philippines (UTC+8)
      const now = new Date()
      const philippinesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      
      // Use scheduledRelease if available, otherwise calculate from period end + release time
      let releaseDateTime: Date
      if (data.periodInfo?.current?.scheduledRelease) {
        releaseDateTime = new Date(data.periodInfo.current.scheduledRelease)
        console.log('Using scheduledRelease:', releaseDateTime.toISOString())
      } else {
        const releaseTime = data.periodInfo?.current?.releaseTime || '17:00'
        const [hours, minutes] = releaseTime.split(':').map(Number)
        releaseDateTime = new Date(data.periodInfo.current.end)
        releaseDateTime.setHours(hours, minutes, 0, 0)
        console.log('Using period end + releaseTime:', releaseDateTime.toISOString())
      }
      
      const diff = releaseDateTime.getTime() - philippinesTime.getTime()
      
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
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            My Payroll
          </h1>
          <p className="text-muted-foreground">View your payroll information and breakdowns</p>
        </div>
      </div>

      {/* Summary Cards - Latest Payroll */}
      {(currentPayroll || (archivedPayrolls && archivedPayrolls.length > 0)) && (() => {
        const latestPayroll = currentPayroll || archivedPayrolls[0]
        let snapshot = latestPayroll.breakdownSnapshot
        if (snapshot && typeof snapshot === 'string') {
          try {
            snapshot = JSON.parse(snapshot)
          } catch (e) {
            snapshot = null
          }
        }
        
        const monthlyBasic = Number(latestPayroll.user?.personnelType?.basicSalary || 20000)
        const periodSalary = monthlyBasic / 2
        const dbNetPay = Number(latestPayroll.netPay || 0)
        const deductions = Number(latestPayroll.deductions || 0)
        let overloadPay = Number(snapshot?.totalAdditions || 0)
        if (overloadPay === 0 && dbNetPay > periodSalary) {
          overloadPay = dbNetPay - periodSalary + deductions
        }
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Monthly Basic Salary</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(monthlyBasic)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Reference</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Period Salary</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(periodSalary)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Semi-monthly</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Overload Pay</p>
                <p className="text-2xl font-bold text-emerald-600">
                  +{formatCurrency(overloadPay)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Additional</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Deductions</p>
                <p className="text-2xl font-bold text-red-600">
                  -{formatCurrency(deductions)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Total</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dbNetPay)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Take home</p>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Payroll Tabs - Current and Archived */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Payroll History
          </CardTitle>
          <CardDescription>
            View your current and archived payrolls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setArchiveOpen(false)}
                className={`px-4 py-2 font-medium transition-colors ${
                  !archiveOpen
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Current Payroll
              </button>
              <button
                onClick={() => setArchiveOpen(true)}
                className={`px-4 py-2 font-medium transition-colors ${
                  archiveOpen
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Archived Payrolls
              </button>
            </div>
          </div>

          {!archiveOpen ? (
            // Current Payroll Tab - Show only the latest released
            currentPayroll ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Period</th>
                      <th className="text-left p-3 font-semibold">Net Pay</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-center p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        {formatDate(currentPayroll.periodStart)} - {formatDate(currentPayroll.periodEnd)}
                      </td>
                      <td className="p-3 font-semibold text-green-600">
                        {formatCurrency(Number(currentPayroll.netPay))}
                      </td>
                      <td className="p-3">
                        <Badge variant="default" className="bg-green-600">
                          {currentPayroll.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(currentPayroll)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Payslip
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No current payroll available.
              </p>
            )
          ) : (
            // Archived Tab - Show all older released payrolls
            archivedPayrolls && archivedPayrolls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Period</th>
                    <th className="text-left p-3 font-semibold">Net Pay</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-center p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedPayrolls.map((payroll: any) => (
                    <tr key={payroll.payroll_entries_id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}
                      </td>
                      <td className="p-3 font-semibold text-green-600">
                        {formatCurrency(Number(payroll.netPay))}
                      </td>
                      <td className="p-3">
                        <Badge variant={payroll.status === 'RELEASED' ? 'default' : 'secondary'} 
                               className={payroll.status === 'RELEASED' ? 'bg-green-600' : ''}>
                          {payroll.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-sm">
                          <div className="font-semibold">Period Salary: {formatCurrency(Number(payroll.basicSalary))}</div>
                          <div className="text-green-600">+ Overload: {formatCurrency(Number(payroll.breakdownSnapshot?.totalAdditions || 0))}</div>
                          <div className="text-red-600">- Deductions: {formatCurrency(Number(payroll.deductions))}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No archived payrolls yet.
              </p>
            )
          )}
        </CardContent>
      </Card>




      {/* Digital Payslip Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>
          {selectedPayroll && (() => {
            // Parse snapshot if string
            let snapshot = selectedPayroll.breakdownSnapshot
            console.log('🔥 RAW breakdownSnapshot:', selectedPayroll.breakdownSnapshot)
            console.log('🔥 Type:', typeof selectedPayroll.breakdownSnapshot)
            
            if (snapshot && typeof snapshot === 'string') {
              try {
                snapshot = JSON.parse(snapshot)
                console.log('✅ Parsed snapshot:', snapshot)
              } catch (e) {
                console.error('❌ Parse error:', e)
                snapshot = null
              }
            }
            
            const monthlyBasic = Number(selectedPayroll.user?.personnelType?.basicSalary || 20000)
            const periodSalary = monthlyBasic / 2 // Semi-monthly = monthly / 2
            const dbNetPay = Number(selectedPayroll.netPay || 0)
            const deductions = Number(selectedPayroll.deductions || 0)
            
            // Calculate overload: if netPay is 18000 and periodSalary is 10000, overload = 8000
            let overloadPay = Number(snapshot?.totalAdditions || 0)
            if (overloadPay === 0 && dbNetPay > periodSalary) {
              overloadPay = dbNetPay - periodSalary + deductions
              console.log('🔥 CALCULATED overload from netPay:', overloadPay)
            }
            
            console.log('💰 Final values:', { monthlyBasic, periodSalary, overloadPay, deductions, dbNetPay })
            
            const grossPay = periodSalary + overloadPay
            const netPay = grossPay - deductions
            
            return (
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">{selectedPayroll.user?.name || 'Personnel'}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedPayroll.periodStart)} - {formatDate(selectedPayroll.periodEnd)}
                </p>
              </div>

              {/* Salary Details */}
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-semibold">Monthly Basic Salary</span>
                  <span>{formatCurrency(monthlyBasic)}</span>
                </div>
                <div className="flex justify-between py-2 border-b bg-green-50 dark:bg-green-950/20 px-2">
                  <span className="font-semibold">Period Salary (Semi-Monthly)</span>
                  <span className="text-green-600 font-bold">{formatCurrency(periodSalary)}</span>
                </div>
                <div className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/20 px-2">
                  <span className="font-semibold">+ Overload Pay</span>
                  <span className="text-emerald-600 font-bold">+{formatCurrency(overloadPay)}</span>
                </div>
                <div className="flex justify-between py-2 border-b bg-red-50 dark:bg-red-950/20 px-2">
                  <span className="font-semibold">- Total Deductions</span>
                  <span className="text-red-600 font-bold">-{formatCurrency(deductions)}</span>
                </div>
                <div className="flex justify-between py-3 bg-primary/10 px-2 rounded">
                  <span className="text-lg font-bold">NET PAY</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(netPay)}</span>
                </div>
              </div>
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Loading Dialog */}
      {selectedPayroll && !selectedBreakdown && detailsOpen && (
        <Dialog open={true} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Loading Payroll Details...</DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Fetching breakdown data...</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


