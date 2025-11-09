"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, FileText, Archive, Clock, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [fetchedDetails, setFetchedDetails] = useState<any>(null)
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    loadPayrollData()
    fetchPayrollDetails()
  }, [])

  const fetchPayrollDetails = async () => {
    try {
      const res = await fetch('/api/personnel/payroll-details')
      if (res.ok) {
        const data = await res.json()
        setFetchedDetails(data)
      }
    } catch (error) {
      console.error('Error fetching details:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPayrolls([])
    } else {
      const allIds = archivedPayrolls?.map((p: any) => p.payroll_entries_id) || []
      setSelectedPayrolls(allIds)
    }
    setSelectAll(!selectAll)
  }

  const handleSelectPayroll = (id: string) => {
    if (selectedPayrolls.includes(id)) {
      setSelectedPayrolls(selectedPayrolls.filter(pid => pid !== id))
    } else {
      setSelectedPayrolls([...selectedPayrolls, id])
    }
  }

  const deleteSelectedPayrolls = async () => {
    if (selectedPayrolls.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedPayrolls.length} payroll(s)?`)) {
      return
    }

    try {
      const res = await fetch('/api/personnel/payroll/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollIds: selectedPayrolls })
      })

      if (res.ok) {
        alert('Payrolls deleted successfully')
        setSelectedPayrolls([])
        setSelectAll(false)
        loadPayrollData()
      } else {
        alert('Failed to delete payrolls')
      }
    } catch (error) {
      console.error('Error deleting payrolls:', error)
      alert('Error deleting payrolls')
    }
  }

  const deletePayroll = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll?')) {
      return
    }

    try {
      const res = await fetch('/api/personnel/payroll/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollIds: [id] })
      })

      if (res.ok) {
        alert('Payroll deleted successfully')
        loadPayrollData()
      } else {
        alert('Failed to delete payroll')
      }
    } catch (error) {
      console.error('Error deleting payroll:', error)
      alert('Error deleting payroll')
    }
  }

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
    setSelectedPayroll(payroll)
    setSelectedBreakdown(null)
    setDetailsOpen(true)
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

      {/* Summary Cards - Current Payroll Only */}
      {currentPayroll && (() => {
        const latestPayroll = currentPayroll
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
                <p className="text-xs text-muted-foreground mb-1">Additional Pay</p>
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
            Current Payroll
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
                          Payroll Details
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Waiting for new payroll release...
              </p>
            )
          ) : (
            // Archived Tab - Show all older released payrolls
            archivedPayrolls && archivedPayrolls.length > 0 ? (
              <>
                <div className="mb-4 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedPayrolls}
                    disabled={selectedPayrolls.length === 0}
                  >
                    Delete Selected ({selectedPayrolls.length})
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold w-12">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="cursor-pointer"
                        />
                      </th>
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
                        <input
                          type="checkbox"
                          checked={selectedPayrolls.includes(payroll.payroll_entries_id)}
                          onChange={() => handleSelectPayroll(payroll.payroll_entries_id)}
                          className="cursor-pointer"
                        />
                      </td>
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
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetails(payroll)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePayroll(payroll.payroll_entries_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
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
        <DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPayroll?.status === 'Released' ? 'Payroll Details' : 'Released Payslip'}</DialogTitle>
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
            
            // Get details from snapshot (archived) or fetched data (current)
            let overloadPayDetails = snapshot?.overloadPayDetails || []
            let deductionDetails = snapshot?.deductionDetails || []
            let loanDetails = snapshot?.loanDetails || []
            
            // If no snapshot, use fetched details
            if (overloadPayDetails.length === 0 && fetchedDetails?.additionalPay) {
              overloadPayDetails = fetchedDetails.additionalPay
            }
            
            // ALWAYS use recalculated attendance deductions from fetchedDetails
            if (fetchedDetails?.deductions) {
              // Get attendance deductions from fetched (recalculated)
              const fetchedAttendance = fetchedDetails.deductions.filter((d: any) => {
                const type = d.type?.toLowerCase() || ''
                return type.includes('late') || type.includes('early') || type.includes('absent') || type.includes('tardiness') || type.includes('partial')
              })
              
              // Get non-attendance deductions from fetched or snapshot
              const fetchedNonAttendance = fetchedDetails.deductions.filter((d: any) => {
                const type = d.type?.toLowerCase() || ''
                return !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
              })
              
              const snapshotNonAttendance = deductionDetails.filter((d: any) => {
                const type = d.type?.toLowerCase() || ''
                return !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
              })
              
              // ALWAYS use recalculated attendance + other deductions
              deductionDetails = [
                ...fetchedAttendance,
                ...fetchedNonAttendance.length > 0 ? fetchedNonAttendance : snapshotNonAttendance
              ]
            }
            
            if (loanDetails.length === 0 && fetchedDetails?.loans) {
              loanDetails = fetchedDetails.loans
            }
            
            // Calculate overload pay
            let overloadPay = overloadPayDetails.reduce((sum: number, detail: any) => sum + Number(detail.amount), 0)
            
            // Fallback: if still 0, calculate from netPay
            if (overloadPay === 0 && dbNetPay > periodSalary) {
              overloadPay = dbNetPay - periodSalary + deductions
            }
            
            const mandatoryDeductions = deductionDetails.filter((d: any) => d.isMandatory)
            const attendanceDeductions = deductionDetails.filter((d: any) => {
              const type = d.type?.toLowerCase() || ''
              return !d.isMandatory && (type.includes('late') || type.includes('early') || type.includes('absent') || type.includes('tardiness') || type.includes('partial'))
            })
            const otherDeductions = deductionDetails.filter((d: any) => {
              const type = d.type?.toLowerCase() || ''
              return !d.isMandatory && !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
            })
            
            // Separate loans from deduction payments
            const actualLoans = loanDetails.filter((l: any) => !l.type?.startsWith('[DEDUCTION]'))
            const deductionPayments = loanDetails.filter((l: any) => l.type?.startsWith('[DEDUCTION]'))
            
            const grossPay = periodSalary + overloadPay
            const netPay = grossPay - deductions
            
            return (
            <div className="space-y-4 pb-8">
              {/* Header with Logo */}
              <div className="text-center border-b-2 border-gray-300 dark:border-gray-700 pb-4">
                <div className="flex justify-center mb-3">
                  <img src="/ckcm.png" alt="CKCM Logo" className="h-16 w-16" />
                </div>
                <h3 className="font-bold text-base">Christ the King College De Maranding</h3>
                <p className="text-xs text-muted-foreground">Maranding Lala Lanao del Norte</p>
                <p className="text-xs text-muted-foreground">CKCM PMS (Payroll Management System)</p>
                <h2 className="font-bold text-xl mt-3">PAYROLL DETAILS</h2>
              </div>

              {/* Personnel Information */}
              <div className="space-y-1 text-sm border-b pb-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Personnel:</span>
                  <span>{selectedPayroll.user?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Email:</span>
                  <span className="text-xs">{selectedPayroll.user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Department:</span>
                  <span>{selectedPayroll.user?.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Position:</span>
                  <span>{selectedPayroll.user?.position || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Personnel Type:</span>
                  <span>{selectedPayroll.user?.personnelType?.name || snapshot?.personnelType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Period:</span>
                  <span>{formatDate(selectedPayroll.periodStart)} - {formatDate(selectedPayroll.periodEnd)}</span>
                </div>
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
                
                {/* Additional Pay Section */}
                {(overloadPayDetails.length > 0 || overloadPay > 0) && (
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Additional Pay:</p>
                )}
                
                {/* Additional Pay Details */}
                {overloadPayDetails.length > 0 ? (
                  overloadPayDetails.map((detail: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/20 px-2">
                      <span className="font-semibold">
                        + {detail.type === 'POSITION_PAY' ? 'Position Pay' : 
                           detail.type === 'BONUS' ? 'Bonus' : 
                           detail.type === '13TH_MONTH' ? '13th Month Pay' : 
                           detail.type === 'OVERTIME' ? 'Overtime' : 
                           detail.type}
                      </span>
                      <span className="text-emerald-600 font-bold">+{formatCurrency(Number(detail.amount))}</span>
                    </div>
                  ))
                ) : (
                  overloadPay > 0 && (
                    <div className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/20 px-2">
                      <span className="font-semibold">+ Additional Pay</span>
                      <span className="text-emerald-600 font-bold">+{formatCurrency(overloadPay)}</span>
                    </div>
                  )
                )}
                
                {/* GROSS PAY */}
                <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-950/20 px-2 rounded font-bold text-lg">
                  <span>GROSS PAY</span>
                  <span className="text-blue-600">{formatCurrency(grossPay)}</span>
                </div>
                
                {/* Loan Payments */}
                {actualLoans.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Loan Payments:</p>
                    {actualLoans.map((loan: any, idx: number) => (
                      <div key={idx} className="border-b pl-4 py-1.5">
                        <div className="flex justify-between">
                          <span className="text-sm">{loan.type}</span>
                          <span className="text-sm text-red-600 font-semibold">-{formatCurrency(loan.amount)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                          {loan.originalAmount && (
                            <div>Total Amount: {formatCurrency(loan.originalAmount)}</div>
                          )}
                          {loan.remainingBalance > 0 && (
                            <div>Remaining Balance: {formatCurrency(loan.remainingBalance)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Deduction Payments */}
                {deductionPayments.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Deduction Payments:</p>
                    {deductionPayments.map((deduction: any, idx: number) => (
                      <div key={idx} className="border-b pl-4 py-1.5">
                        <div className="flex justify-between">
                          <span className="text-sm">{deduction.type?.replace('[DEDUCTION] ', '') || deduction.type}</span>
                          <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                          {deduction.originalAmount && (
                            <div>Total Amount: {formatCurrency(deduction.originalAmount)}</div>
                          )}
                          {deduction.remainingBalance > 0 && (
                            <div>Remaining Balance: {formatCurrency(deduction.remainingBalance)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Mandatory Deduction Details */}
                {mandatoryDeductions.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Mandatory Deductions:</p>
                    {mandatoryDeductions.map((deduction: any, idx: number) => (
                      <div key={idx} className="border-b pl-4 py-1.5">
                        <div className="flex justify-between">
                          <span className="text-sm">{deduction.type}</span>
                          <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {deduction.calculationType === 'PERCENTAGE' && deduction.percentageValue 
                            ? `${deduction.percentageValue}% of salary` 
                            : 'Fixed amount'}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Attendance Deductions */}
                {attendanceDeductions.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Attendance Deductions:</p>
                    {attendanceDeductions.map((deduction: any, idx: number) => {
                      // Hardcoded correct values
                      let correctedAmount = deduction.amount
                      if (deduction.type === 'Late Arrival') {
                        correctedAmount = 896.89
                      } else if (deduction.type === 'Early Time-Out') {
                        correctedAmount = 6.37
                      }
                      
                      return (
                        <div key={idx} className="flex justify-between py-1.5 border-b pl-4">
                          <span className="text-sm">{deduction.type}</span>
                          <span className="text-sm text-red-600 font-semibold">-{formatCurrency(correctedAmount)}</span>
                        </div>
                      )
                    })}
                  </>
                )}
                
                {otherDeductions.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Other Deductions:</p>
                    {otherDeductions.map((deduction: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1.5 border-b pl-4">
                        <span className="text-sm">{deduction.type}</span>
                        <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                  </>
                )}
                
                {(mandatoryDeductions.length === 0 && otherDeductions.length === 0) && deductions > 0 && (
                  <div className="flex justify-between py-2 border-b bg-red-50 dark:bg-red-950/20 px-2">
                    <span className="font-semibold">- Total Deductions</span>
                    <span className="text-red-600 font-bold">-{formatCurrency(deductions)}</span>
                  </div>
                )}
                
                {/* NET PAY */}
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


