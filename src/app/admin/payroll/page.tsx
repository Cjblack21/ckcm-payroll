'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, DollarSign, FileText, Archive, Printer, Download, Settings, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getPayrollSummary, releasePayrollWithAudit, generatePayslips } from '@/lib/actions/payroll'
import { 
  toPhilippinesDateString, 
  calculatePeriodDurationInPhilippines,
  formatDateForDisplay,
  calculateWorkingDaysInPhilippines 
} from '@/lib/timezone'
import { Label } from '@/components/ui/label'

// Types
type PayrollEntry = {
  users_id: string
  name: string
  email: string
  totalWorkHours: number
  finalNetPay: number
  status: 'Pending' | 'Released' | 'Archived'
  breakdown: {
    basicSalary: number
    attendanceDeductions: number
    loanDeductions: number
    otherDeductions: number
    attendanceDetails: AttendanceDetail[]
    loanDetails: LoanDetail[]
    otherDeductionDetails: DeductionDetail[]
  }
}

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

type PayrollPeriod = {
  periodStart: string
  periodEnd: string
  type: 'Weekly' | 'Semi-Monthly' | 'Monthly' | 'Custom'
  status?: 'Pending' | 'Released' | 'Archived'
}

type ArchivedPayroll = {
  id: string
  periodStart: string
  periodEnd: string
  totalEmployees: number
  totalExpenses: number
  totalDeductions: number
  totalNetPay: number
  releasedAt: string
  releasedBy: string
}

export default function PayrollPage() {
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([])
  const [archivedPayrolls, setArchivedPayrolls] = useState<ArchivedPayroll[]>([])
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('current')
  const [hasGeneratedForSettings, setHasGeneratedForSettings] = useState(false)
  
  // Reschedule state
  const [nextPeriodType, setNextPeriodType] = useState('Semi-Monthly')
  const [nextPeriodStart, setNextPeriodStart] = useState('')
  const [nextPeriodEnd, setNextPeriodEnd] = useState('')
  const [nextPeriodNotes, setNextPeriodNotes] = useState('')
  const [showNextPeriodModal, setShowNextPeriodModal] = useState(false)
  
  // Payroll Time Settings state
  const [payrollPeriodStart, setPayrollPeriodStart] = useState('')
  const [payrollPeriodEnd, setPayrollPeriodEnd] = useState('')
  const [savingPeriod, setSavingPeriod] = useState(false)

  // Load payroll data
  const loadPayrollData = async () => {
    try {
      setLoading(true)
      const result = await getPayrollSummary()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load payroll data')
      }

      // Transform data to match our type
      console.log('🔍 Payroll Frontend Debug - Raw data:', result.summary?.payrollEntries)
      
      const entries: PayrollEntry[] = (result.summary?.payrollEntries || []).map((entry: any) => {
        console.log(`🔍 Payroll Entry Debug - User: ${entry.name}, Basic Salary: ₱${entry.personnelType?.basicSalary}, Gross: ₱${entry.grossSalary}, Total Deductions: ₱${entry.totalDeductions}, Net: ₱${entry.netSalary}`)
        console.log(`🔍 Deduction Details - User: ${entry.name}:`, entry.deductionDetails?.map((d: any) => `${d.type}: ₱${d.amount}`))
        console.log(`🔍 Other Deductions - User: ${entry.name}:`, entry.deductionDetails?.filter((d: any) => 
          !d.type.includes('Late') && 
          !d.type.includes('Absent') &&
          !d.type.includes('Early') &&
          !d.type.includes('Tardiness') &&
          !d.type.includes('Partial')
        ).map((d: any) => `${d.type}: ₱${d.amount}`))
        return {
        users_id: entry.users_id,
        name: entry.name,
        email: entry.email,
        totalWorkHours: entry.totalWorkHours || 0,
        finalNetPay: entry.netSalary || 0,
        status: entry.status || 'Pending',
        breakdown: {
          basicSalary: entry.personnelType?.basicSalary || 0,
          attendanceDeductions: entry.attendanceDeductions || 0, // Real-time calculated attendance deductions
          loanDeductions: entry.loanPayments || 0,
          otherDeductions: entry.databaseDeductions || 0, // Database deductions (Philhealth, SSS, etc.)
          attendanceDetails: entry.attendanceRecords?.map((record: any) => ({
            date: record.date,
            timeIn: record.timeIn,
            timeOut: record.timeOut,
            workHours: record.workHours || 0,
            status: record.status,
            deduction: record.deductions || 0
          })) || [],
          loanDetails: [], // Would be populated from loan data
          otherDeductionDetails: entry.deductionDetails?.filter((deduction: any) => {
            // Only include non-attendance deductions (like Philhealth, SSS, etc.)
            return !deduction.type.includes('Late') && 
                   !deduction.type.includes('Absent') &&
                   !deduction.type.includes('Early') &&
                   !deduction.type.includes('Tardiness') &&
                   !deduction.type.includes('Partial')
          }).map((deduction: any) => ({
            type: deduction.type,
            amount: deduction.amount,
            description: deduction.description || ''
          })) || []
        }
        }
      })

      setPayrollEntries(entries)
      // Current Payroll Period should show the settings period (what admin set for next period)
      // Display period follows summary.periodStart/periodEnd (latest non-archived),
      // but button states should follow settings period and hasGeneratedForSettings
      setCurrentPeriod({
        periodStart: result.summary?.settings?.periodStart || '',
        periodEnd: result.summary?.settings?.periodEnd || '',
        type: 'Semi-Monthly'
      })
      // Set payroll period settings
      setPayrollPeriodStart(result.summary?.settings?.periodStart || '')
      setPayrollPeriodEnd(result.summary?.settings?.periodEnd || '')
      // Use settings.hasGeneratedForSettings to control Generate button state
      const generatedState = !!result.summary?.settings?.hasGeneratedForSettings
      console.log('🔍 Payroll UI Debug - hasGeneratedForSettings:', generatedState)
      console.log('🔍 Payroll UI Debug - Settings period:', result.summary?.settings?.periodStart, 'to', result.summary?.settings?.periodEnd)
      console.log('🔍 Payroll UI Debug - Payroll entries count:', entries.length)
      setHasGeneratedForSettings(generatedState)
    } catch (error) {
      console.error('Error loading payroll data:', error)
      toast.error('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }

  // Release payroll - shows modal first to set next period dates
  const handleReleasePayroll = async () => {
    try {
      // Prefill suggested next-period dates based on current period duration using Philippines timezone
      if (currentPeriod?.periodStart && currentPeriod?.periodEnd) {
        const start = new Date(currentPeriod.periodStart)
        const end = new Date(currentPeriod.periodEnd)
        const durationDays = calculatePeriodDurationInPhilippines(start, end)
        const nextStart = new Date(end)
        nextStart.setDate(end.getDate() + 1)
        const nextEnd = new Date(nextStart)
        nextEnd.setDate(nextStart.getDate() + durationDays - 1)
        
        setNextPeriodStart(toPhilippinesDateString(nextStart))
        setNextPeriodEnd(toPhilippinesDateString(nextEnd))
      } else {
        setNextPeriodStart('')
        setNextPeriodEnd('')
      }
      
      // Show modal to capture next period dates before release
      setShowNextPeriodModal(true)
    } catch (error) {
      console.error('Error preparing release payroll:', error)
      toast.error(`Failed to prepare payroll release: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generate payroll entries for current period
  const handleGeneratePayroll = async () => {
    try {
      setLoading(true)
      toast.loading('Generating payroll...', { id: 'generate-payroll' })

      // Call API endpoint to generate payroll
      const res = await fetch('/api/admin/payroll/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate payroll')
      }

      toast.success(data.message || 'Payroll generated successfully!', { id: 'generate-payroll' })
      
      // Force refresh payroll data to update the UI state
      await loadPayrollData()
      // Also refresh archived payrolls since old released payrolls may have been archived
      await loadArchivedPayrolls()
      
      // Force a small delay to ensure state is updated
      setTimeout(() => {
        setHasGeneratedForSettings(true)
        // Show helpful message if there were released entries that got archived
        if (payrollEntries.some(entry => entry.status === 'Released')) {
          toast.success('Previous released payroll has been moved to archive', { duration: 3000 })
        }
      }, 100)
      
    } catch (error) {
      console.error('Error generating payroll:', error)
      toast.error(`Failed to generate payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'generate-payroll' })
    } finally {
      setLoading(false)
    }
  }

  // Generate and print payslips using screenshot route
  const handleGeneratePayslips = async () => {
    try {
      setLoading(true)
      toast.loading('Generating payslips for Long Bond Paper...', { id: 'generate-payslips' })
      
      console.log('🔍 Generate Payslips Debug:', {
        currentPeriod,
        payrollEntries: payrollEntries.length,
        releasedEntries: payrollEntries.filter(e => e.status === 'Released').length,
        statuses: payrollEntries.map(e => e.status)
      })

      // Use the screenshot route which has proper layout
      const response = await fetch('/api/admin/payroll/print-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodStart: currentPeriod?.periodStart,
          periodEnd: currentPeriod?.periodEnd
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Payslip generation error:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to generate payslips')
      }

      // Get the HTML content from the response
      const htmlContent = await response.text()
      
      // Open payslips in new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
      
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        
        toast.success('Payslips generated for Long Bond Paper (8.5" × 13"). Click the print button or press Ctrl+P to print.', { id: 'generate-payslips' })
      } else {
        toast.error('Popup blocked. Please allow popups for localhost:3000 and try again.', { id: 'generate-payslips' })
      }
    } catch (error) {
      console.error('Error generating payslips:', error)
      toast.error(`Failed to generate payslips: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'generate-payslips', duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  // Confirm release from modal
  const handleConfirmRelease = async () => {
    try {
      setLoading(true)
      toast.loading('Releasing payroll...', { id: 'release-payroll' })

      const result = await releasePayrollWithAudit(nextPeriodStart, nextPeriodEnd)
      if (!result.success) {
        throw new Error(result.error || 'Failed to release payroll')
      }

      toast.success(`Payroll released successfully for ${result.releasedCount} employees`, { id: 'release-payroll' })
      setShowNextPeriodModal(false)

      // Update the status of existing payroll entries to "Released" without reloading new data
      setPayrollEntries(prevEntries => 
        prevEntries.map(entry => ({
          ...entry,
          status: 'Released' as const
        }))
      )

      // Update the current period to show it's released
      setCurrentPeriod(prevPeriod => prevPeriod ? {
        ...prevPeriod,
        status: 'Released'
      } : null)

      // IMPORTANT: Reset the generate button state so it can be used for the next period
      setHasGeneratedForSettings(false)
      
      // DO NOT clear payroll entries - keep them visible with RELEASED status
      // The entries are already updated to "Released" status above
      
      // Reload payroll data to get the updated state with new period
      await loadPayrollData()
      
      // Force a small delay to ensure UI updates properly
      setTimeout(() => {
        console.log('🔍 Post-Release Debug - hasGeneratedForSettings reset to:', false)
        console.log('🔍 Post-Release Debug - Payroll entries should still be visible with RELEASED status')
      }, 100)

    } catch (error) {
      console.error('Error confirming release:', error)
      toast.error(`Failed to release payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'release-payroll' })
    } finally {
      setLoading(false)
    }
  }

  // Load archived payrolls
  const loadArchivedPayrolls = async () => {
    try {
      // Fetch archived payrolls from database
      const response = await fetch('/api/admin/payroll/archive', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load archived payrolls')
      }

      const data = await response.json()
      setArchivedPayrolls(data.archivedPayrolls || [])
    } catch (error) {
      console.error('Error loading archived payrolls:', error)
      // Set empty array instead of static data
      setArchivedPayrolls([])
    }
  }

  // Save payroll period settings
  const handleSavePayrollPeriod = async () => {
    try {
      setSavingPeriod(true)
      toast.loading('Saving payroll period...', { id: 'save-period' })

      const response = await fetch('/api/admin/attendance-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: payrollPeriodStart,
          periodEnd: payrollPeriodEnd,
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || error.error || 'Failed to save period')
      }

      toast.success('Payroll period saved successfully!', { id: 'save-period' })
      await loadPayrollData()
    } catch (error) {
      console.error('Error saving payroll period:', error)
      toast.error(`Failed to save period: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'save-period' })
    } finally {
      setSavingPeriod(false)
    }
  }

  // Reschedule next payroll period
  const handleReschedulePeriod = async () => {
    try {
      setLoading(true)
      toast.loading('Rescheduling payroll period...', { id: 'reschedule-period' })

      const response = await fetch('/api/admin/payroll/next-period', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodStart: nextPeriodStart,
          periodEnd: nextPeriodEnd,
          type: nextPeriodType,
          notes: nextPeriodNotes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reschedule period')
      }

      const result = await response.json()
      
      toast.success('Payroll period rescheduled successfully!', { id: 'reschedule-period' })
      
      // Reset form
      setNextPeriodStart('')
      setNextPeriodEnd('')
      setNextPeriodNotes('')
      
      // Reload data to show new period
      await loadPayrollData()
    } catch (error) {
      console.error('Error rescheduling period:', error)
      toast.error(`Failed to reschedule period: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'reschedule-period' })
    } finally {
      setLoading(false)
    }
  }

  // Format work hours
  const formatWorkHours = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`
  }

  // Format currency - exactly 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Released': 'bg-green-100 text-green-800',
      'Archived': 'bg-gray-100 text-gray-800'
    }
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  // Filter entries based on search
  const filteredEntries = payrollEntries.filter(entry =>
    entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    loadPayrollData()
    loadArchivedPayrolls()
  }, [])

  // Load archived payrolls when archive tab is accessed
  useEffect(() => {
    if (activeTab === 'archived') {
      loadArchivedPayrolls()
    }
  }, [activeTab])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">
            Manage employee payroll, generate payslips, and track payroll history
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Workflow: Generate Payroll → Release Payroll → Generate Payslips → Generate New Payroll (moves old to archive)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePayroll} disabled={loading || hasGeneratedForSettings} aria-disabled>
            <FileText className="h-4 w-4 mr-2" />
            {hasGeneratedForSettings ? 'Payroll Generated' : 'Generate Payroll'}
          </Button>
          <Button 
            onClick={handleReleasePayroll} 
            disabled={loading || !hasGeneratedForSettings || currentPeriod?.status === 'Released'} 
            aria-disabled
          >
            <FileText className="h-4 w-4 mr-2" />
            {currentPeriod?.status === 'Released' ? 'Payroll Released' : 'Release Payroll'}
          </Button>
          <Button 
            onClick={handleGeneratePayslips} 
            disabled={loading || currentPeriod?.status !== 'Released' || !payrollEntries.some(e => e.status === 'Released')} 
            aria-disabled
            title={currentPeriod?.status !== 'Released' ? 'Release payroll first to generate payslips' : ''}
          >
            <Printer className="h-4 w-4 mr-2" />
            Generate Payslips
          </Button>
          <Button onClick={() => { console.log('🔍 Debug State:', { hasGeneratedForSettings, payrollEntriesCount: payrollEntries.length, currentPeriod, payrollStatuses: payrollEntries.map(e => ({name: e.name, status: e.status})) }); toast.success('Check console for debug info') }} variant="outline" size="sm">
            Debug
          </Button>
        </div>
      </div>

      {/* Current Period Info */}
      {currentPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Payroll Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Period Start</p>
                <p className="font-medium">{formatDateForDisplay(new Date(currentPeriod.periodStart))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Period End</p>
                <p className="font-medium">{formatDateForDisplay(new Date(currentPeriod.periodEnd))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{currentPeriod.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusBadge(currentPeriod.status || 'Pending')}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Generated</p>
                <div className="flex items-center gap-2">
                  <Badge className={hasGeneratedForSettings ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {hasGeneratedForSettings ? 'Yes' : 'No'}
                  </Badge>
                  {!hasGeneratedForSettings && (
                    <span className="text-xs text-muted-foreground">Ready to generate</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">Current Payroll</TabsTrigger>
          <TabsTrigger value="archived">Archived Payrolls</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Next Period</TabsTrigger>
        </TabsList>

        {/* Current Payroll Tab */}
        <TabsContent value="current" className="space-y-4">
          {/* Search */}
          <div className="flex justify-between items-center">
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="text-sm text-muted-foreground">
              {filteredEntries.length} employee(s) found
            </div>
          </div>

          {/* Payroll Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payroll Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Work Hours</TableHead>
                    <TableHead>Final Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading payroll data...
                      </TableCell>
                    </TableRow>
                  ) : filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No payroll entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.users_id} className={entry.status === 'Released' ? 'bg-green-50' : ''}>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell>{entry.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatWorkHours(entry.totalWorkHours)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            {formatCurrency(entry.finalNetPay)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(entry.status)}
                            {entry.status === 'Released' && (
                              <span className="text-xs text-green-600 font-medium">✓ Ready for Archive</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedEntry(entry)}
                              >
                                View Payroll
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[90vw] max-w-[1400px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Payroll Breakdown - {entry.name}</DialogTitle>
                              </DialogHeader>
                              {selectedEntry && (
                                <div className="space-y-6 w-full overflow-hidden">
                                  {/* Employee Info */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Employee Information</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                          <p className="text-sm text-muted-foreground">Name</p>
                                          <p className="font-medium break-words">{selectedEntry.name}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Email</p>
                                          <p className="font-medium break-words">{selectedEntry.email}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Payroll Period</p>
                                          <p className="font-medium text-sm">
                                            {currentPeriod ? 
                                              `${formatDateForDisplay(new Date(currentPeriod.periodStart))} - ${formatDateForDisplay(new Date(currentPeriod.periodEnd))}` :
                                              'N/A'
                                            }
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Total Work Hours</p>
                                          <p className="font-medium">{formatWorkHours(selectedEntry.totalWorkHours)}</p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Salary Breakdown */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Salary Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-4">
                                        <div className="flex justify-between">
                                          <span>Basic Salary:</span>
                                          <span className="font-medium">{formatCurrency(selectedEntry.breakdown.basicSalary)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                          <span>Attendance Deductions:</span>
                                          <span>-{formatCurrency(selectedEntry.breakdown.attendanceDeductions)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                          <span>Loan Deductions:</span>
                                          <span>-{formatCurrency(selectedEntry.breakdown.loanDeductions)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600">
                                          <span>Other Deductions:</span>
                                          <span>-{formatCurrency(selectedEntry.breakdown.otherDeductions)}</span>
                                        </div>
                                        <hr />
                                        <div className="flex justify-between text-lg font-bold text-green-600">
                                          <span>Final Net Pay:</span>
                                          <span>{formatCurrency(selectedEntry.finalNetPay)}</span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Attendance Details */}
                                  {selectedEntry.breakdown.attendanceDetails.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle>Attendance Details</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="overflow-x-auto w-full">
                                          <Table className="w-full">
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="min-w-[100px]">Date</TableHead>
                                                <TableHead className="min-w-[80px]">Time In</TableHead>
                                                <TableHead className="min-w-[80px]">Time Out</TableHead>
                                                <TableHead className="min-w-[60px]">Hours</TableHead>
                                                <TableHead className="min-w-[80px]">Status</TableHead>
                                                <TableHead className="min-w-[100px]">Deduction</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {selectedEntry.breakdown.attendanceDetails.map((detail, index) => (
                                                <TableRow key={index}>
                                                  <TableCell>{formatDateForDisplay(new Date(detail.date))}</TableCell>
                                                  <TableCell>{detail.timeIn ? new Date(detail.timeIn).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' }) : '-'}</TableCell>
                                                  <TableCell>{detail.timeOut ? new Date(detail.timeOut).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' }) : '-'}</TableCell>
                                                  <TableCell>{formatWorkHours(detail.workHours)}</TableCell>
                                                  <TableCell>
                                                    <Badge variant={detail.status === 'PRESENT' ? 'default' : detail.status === 'LATE' ? 'secondary' : 'destructive'}>
                                                      {detail.status}
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell className="text-red-600">
                                                    {detail.deduction > 0 ? `-${formatCurrency(detail.deduction)}` : '-'}
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
                                  {selectedEntry.breakdown.loanDetails.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle>Loan Details</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="overflow-x-auto w-full">
                                          <Table className="w-full">
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="min-w-[120px]">Loan Type</TableHead>
                                                <TableHead className="min-w-[120px]">Payment Amount</TableHead>
                                                <TableHead className="min-w-[120px]">Remaining Balance</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {selectedEntry.breakdown.loanDetails.map((loan, index) => (
                                                <TableRow key={index}>
                                                  <TableCell>{loan.type}</TableCell>
                                                  <TableCell className="text-red-600">-{formatCurrency(loan.amount)}</TableCell>
                                                  <TableCell>{formatCurrency(loan.remainingBalance)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Other Deduction Details */}
                                  {selectedEntry.breakdown.otherDeductionDetails.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle>Other Deductions</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="overflow-x-auto w-full">
                                          <Table className="w-full">
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="min-w-[120px]">Type</TableHead>
                                                <TableHead className="min-w-[200px]">Description</TableHead>
                                                <TableHead className="min-w-[100px]">Amount</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {selectedEntry.breakdown.otherDeductionDetails.map((deduction, index) => (
                                                <TableRow key={index}>
                                                  <TableCell>{deduction.type}</TableCell>
                                                  <TableCell>{deduction.description}</TableCell>
                                                  <TableCell className="text-red-600">-{formatCurrency(deduction.amount)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archived Payrolls Tab */}
        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archived Payrolls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Total Expenses</TableHead>
                    <TableHead>Total Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Released</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedPayrolls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No archived payrolls found
                      </TableCell>
                    </TableRow>
                  ) : (
                    archivedPayrolls.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell>
                          {formatDateForDisplay(new Date(payroll.periodStart))} - {formatDateForDisplay(new Date(payroll.periodEnd))}
                        </TableCell>
                        <TableCell>{payroll.totalEmployees}</TableCell>
                        <TableCell>{formatCurrency(payroll.totalExpenses)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(payroll.totalDeductions)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(payroll.totalNetPay)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{formatDateForDisplay(new Date(payroll.releasedAt))}</p>
                            <p className="text-xs text-muted-foreground">by {payroll.releasedBy}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Printer className="h-4 w-4 mr-2" />
                            Reprint
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Summary Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Salary Expenses:</span>
                    <span className="font-medium">{formatCurrency(payrollEntries.reduce((sum, entry) => sum + entry.breakdown.basicSalary, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Deductions:</span>
                    <span className="font-medium text-red-600">{formatCurrency(payrollEntries.reduce((sum, entry) => sum + entry.breakdown.attendanceDeductions + entry.breakdown.loanDeductions + entry.breakdown.otherDeductions, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Net Pay:</span>
                    <span className="font-medium text-green-600">{formatCurrency(payrollEntries.reduce((sum, entry) => sum + entry.finalNetPay, 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employee Contribution Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Per-employee deduction breakdown for SSS, PhilHealth, Pag-IBIG, and taxes.
                </p>
                <Button variant="outline" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Log Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track admin actions, payroll releases, and payslip printing history.
                </p>
                <Button variant="outline" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Next Period Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Payroll Time Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Payroll Time Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set the payroll period dates. This will be used to calculate working days and generate payroll.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payrollPeriodStart">Period Start Date</Label>
                    <Input
                      id="payrollPeriodStart"
                      type="date"
                      value={payrollPeriodStart ? toPhilippinesDateString(new Date(payrollPeriodStart)) : ''}
                      onChange={(e) => setPayrollPeriodStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payrollPeriodEnd">Period End Date</Label>
                    <Input
                      id="payrollPeriodEnd"
                      type="date"
                      value={payrollPeriodEnd ? toPhilippinesDateString(new Date(payrollPeriodEnd)) : ''}
                      onChange={(e) => setPayrollPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>
                {payrollPeriodStart && payrollPeriodEnd && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Working Days:</strong> {
                      calculateWorkingDaysInPhilippines(new Date(payrollPeriodStart), new Date(payrollPeriodEnd))
                    } days (excludes Sundays)
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSavePayrollPeriod} 
                    disabled={savingPeriod || !payrollPeriodStart || !payrollPeriodEnd}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingPeriod ? 'Saving...' : 'Save Period'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Reschedule Payroll Period
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure the next payroll period or reschedule the current one.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Period Type</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={nextPeriodType}
                      onChange={(e) => setNextPeriodType(e.target.value)}
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Semi-Monthly">Semi-Monthly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Custom">Custom Range</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input 
                      type="date" 
                      value={nextPeriodStart}
                      onChange={(e) => setNextPeriodStart(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input 
                      type="date" 
                      value={nextPeriodEnd}
                      onChange={(e) => setNextPeriodEnd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Input 
                      placeholder="Optional notes..." 
                      value={nextPeriodNotes}
                      onChange={(e) => setNextPeriodNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleReschedulePeriod}
                    disabled={loading || !nextPeriodStart || !nextPeriodEnd}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Reschedule Period
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setNextPeriodStart('')
                      setNextPeriodEnd('')
                      setNextPeriodNotes('')
                    }}
                  >
                    Clear Form
                  </Button>
                </div>
                
                {/* Current Period Display */}
                {currentPeriod && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Current Period</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Start:</span>
                        <p className="font-medium">{formatDateForDisplay(new Date(currentPeriod.periodStart))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End:</span>
                        <p className="font-medium">{formatDateForDisplay(new Date(currentPeriod.periodEnd))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium">{currentPeriod.type}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Next Period Modal (shown right after successful release) */}
      <Dialog open={showNextPeriodModal} onOpenChange={setShowNextPeriodModal}>
        <DialogContent className="w-[90vw] max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Next Payroll Period</DialogTitle>
            <DialogDescription>
              Suggested duration for the next cycle based on the period you just released.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Period</p>
                <p className="font-medium">
                  {currentPeriod ? `${formatDateForDisplay(new Date(currentPeriod.periodStart))} - ${formatDateForDisplay(new Date(currentPeriod.periodEnd))}` : '—'}
                </p>
              </div>
              <div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Next Period Start</label>
                <Input type="date" value={nextPeriodStart} onChange={(e) => setNextPeriodStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Next Period End</label>
                <Input type="date" value={nextPeriodEnd} onChange={(e) => setNextPeriodEnd(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">These dates will be saved to Attendance Settings and used for the next run.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNextPeriodModal(false)}>Cancel</Button>
            <Button onClick={handleConfirmRelease} disabled={!nextPeriodStart || !nextPeriodEnd}>Confirm & Release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
