'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, ChevronDown, ChevronUp, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, TrendingDown, TrendingUp, Calendar, AlertCircle, UserCheck } from 'lucide-react'
import { formatDateForDisplay } from '@/lib/timezone'
import { Progress } from '@/components/ui/progress'
import { getCurrentDayAttendance } from '@/lib/actions/attendance'

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
  isMandatory?: boolean
  calculationType?: 'FIXED' | 'PERCENTAGE'
  percentageValue?: number
  basicSalary?: number
}

type PayrollBreakdown = {
  basicSalary: number
  monthlyBasicSalary?: number // Add optional monthly reference
  attendanceDeductions: number
  leaveDeductions?: number
  loanDeductions: number
  otherDeductions: number
  overloadPay?: number // Overload pay (additional salary)
  overloadPayDetails?: Array<{type: string, amount: number}> // Additional pay breakdown by type
  attendanceDetails: AttendanceDetail[]
  loanDetails: LoanDetail[]
  otherDeductionDetails: DeductionDetail[]
}

type PayrollEntry = {
  users_id: string
  name: string
  email: string
  personnelType?: string
  department?: string | null
  personnelTypeCategory?: 'TEACHING' | 'NON_TEACHING' | null
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
  onArchive?: (userId: string) => void // Optional archive handler for admin
  showArchiveButton?: boolean // Show archive button (admin only)
}

export default function PayrollBreakdownDialog({
  entry,
  currentPeriod,
  isOpen,
  onClose,
  onArchive,
  showArchiveButton = false
}: PayrollBreakdownDialogProps) {
  const [attendanceSettings, setAttendanceSettings] = React.useState<any>(null)
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set())
  const [deductionTypes, setDeductionTypes] = React.useState<any[]>([])
  const [liveDeductions, setLiveDeductions] = React.useState<any[]>([])
  const [todayAttendanceStatus, setTodayAttendanceStatus] = React.useState<string | null>(null)
  const [liveLoans, setLiveLoans] = React.useState<any[]>([])
  
  // Load attendance settings for early timeout detection
  React.useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/admin/attendance-settings')
        if (response.ok) {
          const data = await response.json()
          setAttendanceSettings(data.settings)
        }
      } catch (error) {
        console.error('Error loading attendance settings:', error)
      }
    }
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])
  
  // Load deduction types to get live isMandatory status
  React.useEffect(() => {
    async function loadDeductionTypes() {
      try {
        const response = await fetch('/api/admin/deduction-types')
        if (response.ok) {
          const types = await response.json()
          setDeductionTypes(types)
          console.log('🔍 Loaded deduction types:', types.map((t: any) => `${t.name}: isMandatory=${t.isMandatory}`))
        }
      } catch (error) {
        console.error('Error loading deduction types:', error)
      }
    }
    if (isOpen) {
      loadDeductionTypes()
    }
  }, [isOpen])
  
  // Load today's attendance status (skip for archived entries)
  React.useEffect(() => {
    async function loadTodayAttendance() {
      if (!entry?.users_id) return
      
      // Skip live data for archived entries
      if (entry.status === 'Archived') {
        console.log('⏭️ Skipping live attendance fetch for archived entry')
        return
      }
      
      try {
        const result = await getCurrentDayAttendance()
        console.log('🔍 Breakdown Dialog - Fetching attendance for:', entry.name, entry.users_id)
        console.log('🔍 Total records:', result.attendance?.length)
        console.log('🔍 All records:', result.attendance?.map((r: any) => ({
          user: r.users_id,
          status: r.status
        })))
        
        if (result.success && result.attendance) {
          // getCurrentDayAttendance only returns today's records, so just find by user ID
          const todayRecord = result.attendance.find((record: any) => 
            record.users_id === entry.users_id
          )
          console.log('🔍 Found record for user:', todayRecord)
          setTodayAttendanceStatus(todayRecord?.status || null)
          console.log('🔍 Set status to:', todayRecord?.status || null)
        }
      } catch (error) {
        console.error('Error loading today attendance:', error)
      }
    }
    if (isOpen && entry) {
      loadTodayAttendance()
    }
  }, [isOpen, entry?.users_id, entry?.status])

  // Load live deductions for this user to show newly added deductions (skip for archived)
  React.useEffect(() => {
    async function loadLiveDeductions() {
      if (!entry?.users_id) return
      
      // Skip live data for archived entries - use snapshot data instead
      if (entry.status === 'Archived') {
        console.log('⏭️ Skipping live deductions fetch for archived entry')
        return
      }
      
      console.log('🔍🔍🔍 FETCHING LIVE DEDUCTIONS for user:', entry.name, entry.users_id)
      
      try {
        // Add cache busting to ensure fresh data
        const response = await fetch(`/api/admin/deductions?_t=${Date.now()}`)
        if (response.ok) {
          const allDeductions = await response.json()
          console.log('🔍 Total deductions fetched:', allDeductions.length)
          
          // Filter to only this user's non-archived deductions
          const userDeductions = allDeductions.filter((d: any) => 
            d.users_id === entry.users_id && !d.archivedAt
          )
          
          console.log('🔍🔍🔍 USER DEDUCTIONS for', entry.name, ':', userDeductions.map((d: any) => `${d.deductionType.name}: ₱${d.amount} (Mandatory: ${d.deductionType.isMandatory})`))
          
          setLiveDeductions(userDeductions)
        }
      } catch (error) {
        console.error('Error loading live deductions:', error)
      }
    }
    if (isOpen && entry) {
      // Reset state first to ensure fresh load
      setLiveDeductions([])
      loadLiveDeductions()
    }
  }, [isOpen, entry?.users_id, entry?.status])
  
  // Load live loans for this user to show all active loans/deductions (skip for archived)
  React.useEffect(() => {
    async function loadLiveLoans() {
      if (!entry?.users_id) return
      
      // Skip live data for archived entries - use snapshot data instead
      if (entry.status === 'Archived') {
        console.log('⏭️ Skipping live loans fetch for archived entry')
        return
      }
      
      console.log('🔍🔍🔍 FETCHING LIVE LOANS/DEDUCTIONS for user:', entry.name, entry.users_id)
      
      try {
        const response = await fetch(`/api/admin/loans?_t=${Date.now()}`)
        if (response.ok) {
          const allLoans = await response.json()
          console.log('🔍 Total loans fetched:', allLoans.items?.length)
          
          // Filter to only this user's active loans/deductions
          const userLoans = (allLoans.items || []).filter((l: any) => 
            l.users_id === entry.users_id && l.status === 'ACTIVE'
          )
          
          console.log('🔍🔍🔍 USER LOANS for', entry.name, ':', userLoans.map((l: any) => `${l.purpose}: ₱${l.amount} (Balance: ₱${l.balance})`))
          
          setLiveLoans(userLoans)
        }
      } catch (error) {
        console.error('Error loading live loans:', error)
      }
    }
    if (isOpen && entry) {
      setLiveLoans([])
      loadLiveLoans()
    }
  }, [isOpen, entry?.users_id, entry?.status])
  
  // Toggle expand/collapse for attendance detail
  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }
  
  // Merge cached deductions from payroll with live deductions from database
  // IMPORTANT: This must be called before the early return to maintain hook order
  const mergedDeductions = React.useMemo(() => {
    if (!entry) return []
    
    // Start with cached deductions from payroll snapshot
    const deductionsMap = new Map()
    
    // Add all deductions from payroll data
    entry.breakdown.otherDeductionDetails.forEach((d: any) => {
      deductionsMap.set(d.type.toLowerCase(), {
        type: d.type,
        amount: d.amount,
        description: d.description,
        isMandatory: d.isMandatory
      })
    })
    
    // Override/add with live deductions from database (fresher data)
    liveDeductions.forEach((d: any) => {
      const typeName = d.deductionType.name
      const typeNameLower = typeName.toLowerCase()
      
      // Skip attendance-related deductions (handled separately)
      if (
        typeNameLower.includes('late') ||
        typeNameLower.includes('absent') ||
        typeNameLower.includes('early') ||
        typeNameLower.includes('tardiness') ||
        typeNameLower.includes('partial')
      ) {
        return
      }
      
      deductionsMap.set(typeNameLower, {
        type: typeName,
        amount: parseFloat(d.amount.toString()),
        description: d.deductionType.description || d.notes || '',
        isMandatory: d.deductionType.isMandatory,
        calculationType: d.deductionType.calculationType,
        percentageValue: d.deductionType.percentageValue,
        basicSalary: d.user?.personnelType?.basicSalary
      })
    })
    
    const merged = Array.from(deductionsMap.values())
    console.log('🔍 MERGED deductions (cached + live):', merged.map((d: any) => `${d.type}: ₱${d.amount} (Mandatory: ${d.isMandatory})`))
    return merged
  }, [entry, liveDeductions])
  
  // FORCE: Merge cached loan data with live loans from database
  const mergedLoans = React.useMemo(() => {
    if (!entry) return []
    
    const loansMap = new Map()
    
    // Add cached loans from payroll
    entry.breakdown.loanDetails.forEach((item: any) => {
      loansMap.set(item.type, {
        type: item.type,
        amount: item.amount,
        remainingBalance: item.remainingBalance
      })
    })
    
    // Override/add with live loans
    liveLoans.forEach((loan: any) => {
      const isDeduction = loan.purpose?.startsWith('[DEDUCTION]')
      const displayName = isDeduction ? loan.purpose : loan.purpose || 'Loan'
      
      // Calculate payment amount (monthly payment / 2 for semi-monthly)
      const monthlyPayment = loan.amount * (loan.monthlyPaymentPercent / 100)
      const paymentAmount = monthlyPayment / 2
      
      loansMap.set(displayName, {
        type: displayName,
        amount: paymentAmount,
        remainingBalance: loan.balance
      })
    })
    
    return Array.from(loansMap.values())
  }, [entry, liveLoans])
  
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
  
  // Calculate total work hours from attendance details for this period
  const calculatedTotalWorkHours = entry.breakdown.attendanceDetails.reduce(
    (sum, detail) => sum + (detail.workHours || 0),
    0
  )
  
  // Add today's live absence deduction if applicable
  const todayString = new Date().toISOString().split('T')[0]
  const hasTodayInRecords = entry.breakdown.attendanceDetails.some(d => d.date.startsWith(todayString))
  const todayAbsenceDeduction = (todayAttendanceStatus === 'ABSENT' && !hasTodayInRecords) 
    ? entry.breakdown.basicSalary / 11 
    : 0

  // Debug: Log all deductions with their isMandatory flag
  console.log('🔍 ALL otherDeductionDetails:', mergedDeductions.map((d: any) => ({
    type: d.type,
    amount: d.amount,
    isMandatory: d.isMandatory,
    isMandatoryType: typeof d.isMandatory
  })))

  // Helper function to check if a deduction is mandatory by looking up live deduction type data
  const isMandatoryDeduction = (deduction: any): boolean => {
    // First try the cached value from payroll data
    if (deduction.isMandatory === true || deduction.isMandatory === 1) {
      return true
    }
    
    // If deductionTypes are loaded, check the live data from admin/deduction-types
    if (deductionTypes.length > 0) {
      const deductionType = deductionTypes.find((t: any) => 
        t.name.toLowerCase() === deduction.type.toLowerCase()
      )
      if (deductionType) {
        console.log(`🔍 Live lookup for ${deduction.type}: isMandatory=${deductionType.isMandatory}`)
        return deductionType.isMandatory === true
      }
    }
    
    return false
  }

  // Separate mandatory deductions from other deductions (using merged data)
  const mandatoryDeductions = mergedDeductions
    .filter((deduction: any) => {
      const isMand = isMandatoryDeduction(deduction)
      console.log(`🔍 Checking ${deduction.type}: result=${isMand}`)
      return isMand
    })
  const totalMandatoryDeductions = mandatoryDeductions.reduce((sum, d) => sum + d.amount, 0)
  
  console.log('🎯 MANDATORY DEDUCTIONS:', mandatoryDeductions.map((d: any) => d.type))

  // Other deductions (excluding mandatory and attendance-related) - using merged data
  const otherDeductionsOnly = mergedDeductions
    .filter((deduction: any) => {
      const type = deduction.type.toLowerCase()
      const isMandatory = isMandatoryDeduction(deduction)
      const isAttendance = type.includes('late') || 
                          type.includes('absent') || 
                          type.includes('absence') ||
                          type.includes('early') ||
                          type.includes('tardiness') ||
                          type.includes('partial')
      const shouldInclude = !isMandatory && !isAttendance
      console.log(`🔍 ${type}: isMandatory=${isMandatory}, isAttendance=${isAttendance}, include=${shouldInclude}`)
      return shouldInclude
    })
  const totalOtherDeductions = otherDeductionsOnly.reduce((sum, d) => sum + d.amount, 0)
  
  console.log('🎯 OTHER DEDUCTIONS:', otherDeductionsOnly.map((d: any) => d.type))

  // Separate loan payments from deduction payments
  const actualLoans = mergedLoans.filter((item: any) => !item.type?.startsWith('[DEDUCTION]'))
  const actualDeductions = mergedLoans.filter((item: any) => item.type?.startsWith('[DEDUCTION]'))
  const totalLoanPayments = actualLoans.reduce((sum, loan) => sum + loan.amount, 0)
  const totalDeductionPayments = actualDeductions.reduce((sum, ded) => sum + ded.amount, 0)

  // Calculate total deductions from all deduction sources
  const totalDeductions = 
    Number(entry.breakdown.attendanceDeductions) +
    todayAbsenceDeduction +
    totalLoanPayments +
    totalDeductionPayments +
    totalMandatoryDeductions +
    totalOtherDeductions

  // Get overload pay (additional salary)
  const overloadPay = Number(entry.breakdown.overloadPay || 0)

  // The breakdown.basicSalary is the semi-monthly base salary WITHOUT overload
  // We need to add overload pay to get the gross pay
  const storedBasicSalary = Number(entry.breakdown.basicSalary)
  const grossPay = storedBasicSalary + overloadPay
  
  // Calculate net pay correctly: Gross Pay - Total Deductions
  const netPay = grossPay - totalDeductions
  
  console.log('💰 NET PAY CALCULATION:')
  console.log('  Monthly Basic Salary:', entry.breakdown.monthlyBasicSalary)
  console.log('  Stored Basic Salary (includes overload):', storedBasicSalary)
  console.log('  Overload Pay (for display only):', overloadPay)
  console.log('  Gross Pay:', grossPay)
  console.log('  Total Deductions:', totalDeductions)
  console.log('  NET PAY:', netPay)

  // Build comprehensive deduction breakdown including all types
  const deductionBreakdown = [
    {
      label: 'Attendance Deductions',
      amount: entry.breakdown.attendanceDeductions + todayAbsenceDeduction,
      percentage: totalDeductions > 0 ? ((entry.breakdown.attendanceDeductions + todayAbsenceDeduction) / totalDeductions) * 100 : 0,
      color: 'bg-red-500',
      description: todayAbsenceDeduction > 0 ? `Late, Absent, Partial Day (includes today: ₱${formatCurrency(todayAbsenceDeduction)})` : 'Late, Absent, Partial Day'
    },
    {
      label: 'Loans',
      amount: totalLoanPayments,
      percentage: totalDeductions > 0 ? (totalLoanPayments / totalDeductions) * 100 : 0,
      color: 'bg-yellow-500',
      description: 'Active Loan Payments'
    },
    {
      label: 'Deductions',
      amount: totalDeductionPayments,
      percentage: totalDeductions > 0 ? (totalDeductionPayments / totalDeductions) * 100 : 0,
      color: 'bg-orange-500',
      description: 'Other Deductions (Equipment, Uniform, etc.)'
    },
    // Add individual mandatory deductions (SSS, PhilHealth, Pag-IBIG, BIR) as separate items
    ...mandatoryDeductions.map((deduction) => ({
      label: deduction.type,
      amount: deduction.amount,
      percentage: totalDeductions > 0 ? (deduction.amount / totalDeductions) * 100 : 0,
      color: deduction.type.toLowerCase().includes('sss') ? 'bg-blue-500' :
             deduction.type.toLowerCase().includes('philhealth') ? 'bg-green-500' :
             deduction.type.toLowerCase().includes('pagibig') || deduction.type.toLowerCase().includes('pag-ibig') ? 'bg-teal-500' :
             deduction.type.toLowerCase().includes('bir') ? 'bg-purple-500' :
             'bg-indigo-500',
      description: deduction.calculationType === 'PERCENTAGE' && deduction.percentageValue 
        ? `${deduction.percentageValue}% of ${formatCurrency(entry.breakdown.monthlyBasicSalary || entry.breakdown.basicSalary * 2)}` 
        : (deduction.description || 'Mandatory payroll deduction'),
      calculationType: deduction.calculationType,
      percentageValue: deduction.percentageValue
    })),
    // Add individual other deductions (non-mandatory, non-attendance)
    ...otherDeductionsOnly.map((deduction) => ({
      label: deduction.type,
      amount: deduction.amount,
      percentage: totalDeductions > 0 ? (deduction.amount / totalDeductions) * 100 : 0,
      color: 'bg-gray-500',
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
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <p className="text-sm text-muted-foreground">
                    {currentPeriod ? 
                      `${formatDateForDisplay(new Date(currentPeriod.periodStart))} - ${formatDateForDisplay(new Date(currentPeriod.periodEnd))}` :
                      'N/A'
                    }
                  </p>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">ID: {entry.users_id}</p>
                  {entry.department && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant="outline" className="text-xs">
                        {entry.department}
                      </Badge>
                    </>
                  )}
                  {entry.personnelType && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.personnelType}
                      </Badge>
                    </>
                  )}
                  {entry.personnelTypeCategory && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <Badge 
                        variant={entry.personnelTypeCategory === 'TEACHING' ? 'default' : 'secondary'}
                        className={entry.personnelTypeCategory === 'TEACHING' 
                          ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs' 
                          : 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-xs'
                        }
                      >
                        {entry.personnelTypeCategory === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                      </Badge>
                    </>
                  )}
                </div>
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
          {/* Monthly Reference Card */}
          {entry.breakdown.monthlyBasicSalary && (
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Monthly Basic Salary (Reference)</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                      {formatCurrency(entry.breakdown.monthlyBasicSalary)}
                    </p>
                  </div>
                  <div className="text-center border-l border-blue-300 dark:border-blue-700 pl-4">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Period Salary</p>
                    <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                      {formatCurrency(entry.breakdown.basicSalary)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">(÷ 2 for semi-monthly)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Summary Cards - Larger Design */}
          <div className="grid grid-cols-3 gap-6">
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
                  {formatWorkHours(calculatedTotalWorkHours)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">For this period only</p>
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
            <Card className="border-2">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">₱</span>
                  Salary Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {/* Monthly Basic Salary Reference */}
                  {entry.breakdown.monthlyBasicSalary && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Monthly Basic Salary</span>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">(Reference)</p>
                      </div>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrency(entry.breakdown.monthlyBasicSalary)}</span>
                    </div>
                  )}
                  
                  {/* Period Salary */}
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-300 dark:border-green-700">
                    <div>
                      <span className="text-base font-bold text-green-900 dark:text-green-100">Period Salary (Semi-Monthly)</span>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">÷ 2 for semi-monthly</p>
                    </div>
                    <span className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(entry.breakdown.monthlyBasicSalary ? entry.breakdown.monthlyBasicSalary / 2 : entry.breakdown.basicSalary)}</span>
                  </div>
                  
                  {/* Additional Pay - Show by type */}
                  {entry.breakdown.overloadPayDetails && entry.breakdown.overloadPayDetails.length > 0 ? (
                    entry.breakdown.overloadPayDetails.map((detail, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-300 dark:border-emerald-700">
                        <div>
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            + {detail.type === 'POSITION_PAY' ? 'Position Pay' : 
                               detail.type === 'BONUS' ? 'Bonus' : 
                               detail.type === '13TH_MONTH' ? '13th Month Pay' : 
                               detail.type === 'OVERTIME' ? 'Overtime' : 
                               detail.type}
                          </span>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Additional compensation</p>
                        </div>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">+{formatCurrency(detail.amount)}</span>
                      </div>
                    ))
                  ) : (
                    entry.breakdown.overloadPay && entry.breakdown.overloadPay > 0 && (
                      <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-300 dark:border-emerald-700">
                        <div>
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">+ Additional Pay</span>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Extra compensation</p>
                        </div>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">+{formatCurrency(entry.breakdown.overloadPay)}</span>
                      </div>
                    )
                  )}

                  {/* Divider */}
                  <div className="border-t-2 border-dashed my-3"></div>
                  
                  {/* Deductions Section */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Deductions</p>
                    
                    {/* Attendance Deductions */}
                    {entry.breakdown.attendanceDeductions > 0 && (
                      <div className="flex justify-between items-center p-2.5 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <span className="text-sm text-red-700 dark:text-red-300">Attendance Deductions</span>
                        <span className="font-semibold text-red-700 dark:text-red-300">-{formatCurrency(entry.breakdown.attendanceDeductions)}</span>
                      </div>
                    )}

                    {/* Mandatory Deductions - Show individually */}
                    {mandatoryDeductions.map((deduction, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{deduction.type}</span>
                          {deduction.calculationType === 'PERCENTAGE' && deduction.percentageValue && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                              {deduction.percentageValue}% of monthly salary
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-blue-700 dark:text-blue-300">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}

                    {/* Loan Payments */}
                    {totalLoanPayments > 0 && (
                      <div className="flex justify-between items-center p-2.5 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">Loan Payments</span>
                        <span className="font-semibold text-yellow-700 dark:text-yellow-300">-{formatCurrency(totalLoanPayments)}</span>
                      </div>
                    )}

                    {/* Other Deductions */}
                    {totalDeductionPayments > 0 && (
                      <div className="flex justify-between items-center p-2.5 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                        <span className="text-sm text-orange-700 dark:text-orange-300">Other Deductions</span>
                        <span className="font-semibold text-orange-700 dark:text-orange-300">-{formatCurrency(totalDeductionPayments)}</span>
                      </div>
                    )}

                    {/* Non-mandatory Other Deductions */}
                    {otherDeductionsOnly.map((deduction, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{deduction.type}</span>
                          {deduction.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{deduction.description}</p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total Deductions Summary */}
                  {totalDeductions > 0 && (
                    <div className="flex justify-between items-center p-3 bg-red-100 dark:bg-red-950/30 rounded-lg border border-red-300 dark:border-red-700 mt-2">
                      <span className="text-sm font-bold text-red-800 dark:text-red-200">Total Deductions</span>
                      <span className="text-lg font-bold text-red-800 dark:text-red-200">-{formatCurrency(totalDeductions)}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t-2 border-dashed my-4"></div>

                  {/* Net Pay - Final Result */}
                  <div className="flex justify-between items-center p-5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg border-2 border-primary shadow-md">
                    <div>
                      <span className="text-lg font-bold text-primary">Net Pay</span>
                      <p className="text-xs text-primary/80 mt-1">{netPayPercentage.toFixed(1)}% of period salary</p>
                    </div>
                    <span className="text-3xl font-bold text-primary">
                      {formatCurrency(netPay)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Attendance Details - Redesigned with Card Layout */}
          {(() => {
            // Filter out future dates and PENDING status (current day before cutoff) before displaying
            const today = new Date()
            today.setHours(23, 59, 59, 999)
            const filteredDetails = entry.breakdown.attendanceDetails.filter(detail => {
              const recordDate = new Date(detail.date)
              // Don't show future dates
              if (recordDate > today) return false
              // Don't show PENDING status (means we're still waiting for attendance)
              if (detail.status === 'PENDING') return false
              // Don't show ABSENT records with no deduction (before cutoff)
              // Check both 'deduction' and 'deductions' field names
              const deductionAmount = detail.deduction || detail.deductions || 0
              if (detail.status === 'ABSENT' && deductionAmount === 0) return false
              return true
            })
            
            // Just use the filtered details directly - don't add today's status manually
            const allDetails = filteredDetails
            
            return allDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Attendance Details
                    </CardTitle>
                    <Badge variant="secondary" className="text-sm">
                      {allDetails.length} {allDetails.length === 1 ? 'day' : 'days'} recorded
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allDetails.map((detail, index) => {
                      const isExpanded = expandedItems.has(index)
                      
                      // Check if this is today's record
                      const recordDate = new Date(detail.date)
                      const todayDate = new Date()
                      const isToday = recordDate.toDateString() === todayDate.toDateString()
                    
                    // Debug logging
                    console.log('Attendance Detail:', {
                      date: detail.date,
                      status: detail.status,
                      deduction: detail.deduction,
                      timeIn: detail.timeIn,
                      timeOut: detail.timeOut
                    })
                    
                    console.log('Absence Check:', {
                      date: detail.date,
                      statusIsAbsent: detail.status === 'ABSENT',
                      noTimeInOut: !detail.timeIn && !detail.timeOut,
                      notPresent: detail.status !== 'PRESENT',
                      willShowAsAbsent: detail.status === 'ABSENT' || (!detail.timeIn && !detail.timeOut && detail.status !== 'PRESENT')
                    })
                    
                    // Calculate expected times and delays
                    const timeInDate = detail.timeIn ? new Date(detail.timeIn) : null
                    const timeOutDate = detail.timeOut ? new Date(detail.timeOut) : null
                    
                    // Check for late arrival (same as admin/attendance)
                    let isLate = false
                    let lateMinutes = 0
                    let lateDeduction = 0
                    if (detail.timeIn && attendanceSettings?.timeInEnd) {
                      const timeIn = new Date(detail.timeIn)
                      const expectedTimeIn = new Date(recordDate)
                      const [hours, minutes] = attendanceSettings.timeInEnd.split(':').map(Number)
                      const expectedMinutes = minutes + 1
                      if (expectedMinutes >= 60) {
                        expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
                      } else {
                        expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
                      }
                      isLate = timeIn > expectedTimeIn
                      if (isLate) {
                        lateMinutes = Math.floor((timeIn.getTime() - expectedTimeIn.getTime()) / (1000 * 60))
                      }
                    }
                    
                    // Check for early timeout (same as admin/attendance)
                    let hasEarlyTimeout = false
                    let earlyMinutes = 0
                    let earlyDeduction = 0
                    if (detail.timeOut && attendanceSettings?.timeOutStart) {
                      const timeOut = new Date(detail.timeOut)
                      const [hours, minutes] = attendanceSettings.timeOutStart.split(':').map(Number)
                      const expectedTimeOut = new Date(recordDate)
                      expectedTimeOut.setHours(hours, minutes, 0, 0)
                      hasEarlyTimeout = timeOut < expectedTimeOut
                      if (hasEarlyTimeout) {
                        earlyMinutes = Math.floor((expectedTimeOut.getTime() - timeOut.getTime()) / (1000 * 60))
                      }
                    }
                    
                    // Split the total deduction proportionally based on late/early minutes
                    if (detail.deduction > 0 && (lateMinutes > 0 || earlyMinutes > 0)) {
                      const totalMinutes = lateMinutes + earlyMinutes
                      if (totalMinutes > 0) {
                        lateDeduction = (lateMinutes / totalMinutes) * detail.deduction
                        earlyDeduction = (earlyMinutes / totalMinutes) * detail.deduction
                      }
                    }
                    
                    // Check if this is a future date (shouldn't show as absent)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0) // Start of today
                    const isFutureDate = recordDate > today
                    
                    // Force absent detection: if no time in/out AND has deduction, it's absent
                    const isAbsent = !isFutureDate && !detail.timeIn && !detail.timeOut
                    const isPartial = detail.status === 'PARTIAL' && !isAbsent
                    
                    console.log('🔍 ABSENT DETECTION:', {
                      date: new Date(detail.date).toLocaleDateString(),
                      status: detail.status,
                      isFutureDate,
                      hasTimeIn: !!detail.timeIn,
                      hasTimeOut: !!detail.timeOut,
                      isAbsent,
                      cardColorWillBe: isAbsent ? 'RED' : isLate ? 'ORANGE' : 'GREEN'
                    })
                    
                    // Calculate absence deduction consistently
                    let displayDeduction = detail.deduction
                    if (isAbsent && entry.breakdown.basicSalary > 0) {
                      // Always use the database deduction if available, otherwise calculate
                      if (detail.deduction > 0) {
                        displayDeduction = detail.deduction
                      } else {
                        // Calculate daily rate: Semi-Monthly Salary / Working Days
                        // Estimate working days as ~11 for semi-monthly period
                        const workingDays = 11
                        displayDeduction = entry.breakdown.basicSalary / workingDays
                        console.log(`📊 Calculated absence deduction for ${new Date(detail.date).toLocaleDateString()}: ₱${displayDeduction.toFixed(2)}`)
                      }
                    }
                    
                    return (
                      <Card 
                        key={index} 
                        className={`border-l-4 transition-all ${
                          (isAbsent || detail.workHours === 0) ? 'border-l-red-600 bg-red-50 dark:bg-red-950/20' :
                          isLate ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' :
                          hasEarlyTimeout ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                          isPartial ? 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20' :
                          'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Date and Status */}
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex flex-col items-center min-w-[80px] pt-1">
                                <div className="text-2xl font-bold">
                                  {new Date(detail.date).toLocaleDateString('en-US', { day: '2-digit' })}
                                </div>
                                <div className="text-xs text-muted-foreground uppercase">
                                  {new Date(detail.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                              
                              {/* Time In/Out Details - Show special layout for absent */}
                              {(isAbsent || detail.workHours === 0) ? (
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="text-center py-2">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                                    <Badge variant="destructive" className="text-sm px-3 py-1 font-bold">
                                      ABSENT
                                    </Badge>
                                    <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                                      No attendance recorded
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                  {/* Time In */}
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                      </svg>
                                      Time In
                                    </div>
                                    <div className="text-base font-semibold flex items-center gap-2">
                                      {timeInDate ? (
                                        <>
                                          {new Date(detail.timeIn).toLocaleTimeString('en-US', { 
                                            timeZone: 'Asia/Manila',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                          {isLate && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-700 border-orange-300">
                                              +{Math.floor(lateMinutes / 60) > 0 ? `${Math.floor(lateMinutes / 60)}h ` : ''}{lateMinutes % 60}m
                                            </Badge>
                                          )}
                                        </>
                                      ) : <span className="text-muted-foreground">—</span>}
                                    </div>
                                  </div>
                                  
                                  {/* Time Out */}
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                      </svg>
                                      Time Out
                                    </div>
                                    <div className="text-base font-semibold flex items-center gap-2">
                                      {timeOutDate ? (
                                        <>
                                          {new Date(detail.timeOut).toLocaleTimeString('en-US', { 
                                            timeZone: 'Asia/Manila',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                          {hasEarlyTimeout && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-300">
                                              -{Math.floor(earlyMinutes / 60) > 0 ? `${Math.floor(earlyMinutes / 60)}h ` : ''}{earlyMinutes % 60}m
                                            </Badge>
                                          )}
                                        </>
                                      ) : <span className="text-muted-foreground">—</span>}
                                    </div>
                                  </div>
                                  
                                  {/* Attendance Details */}
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Details</div>
                                    <div className="flex flex-wrap items-center gap-1">
                                      {isPartial && (
                                        <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                          Partial
                                        </Badge>
                                      )}
                                      {!isPartial && (
                                        <>
                                          {isLate && (
                                            <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                              Late Arrival
                                            </Badge>
                                          )}
                                          {hasEarlyTimeout && (
                                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                              Early Departure
                                            </Badge>
                                          )}
                                          {!isLate && !hasEarlyTimeout && detail.status === 'PRESENT' && (
                                            <Badge variant="default" className="text-xs bg-green-50 text-green-700 border-green-300">
                                              On Time
                                            </Badge>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Right: Work Hours and Deduction */}
                            <div className="text-right space-y-2 min-w-[180px]">
                              {!(isAbsent || detail.workHours === 0) && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Work Hours</div>
                                  <div className="text-lg font-bold flex items-center justify-end gap-1">
                                    <Clock className="w-4 h-4" />
                                    {formatWorkHours(detail.workHours)}
                                  </div>
                                </div>
                              )}
                              
                              {(displayDeduction > 0 || isLate || hasEarlyTimeout || isAbsent || isPartial) && (
                                <div className={`pt-2 ${!(isAbsent || detail.workHours === 0) ? 'border-t' : ''}`}>
                                  {(isAbsent || detail.workHours === 0) ? (
                                    // Special display for absent
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Absence Penalty</div>
                                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                                        -{formatCurrency(displayDeduction)}
                                      </div>
                                      <div className="text-[10px] text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/50 p-1.5 rounded">
                                        <div className="font-semibold">Full Day Salary Loss</div>
                                      </div>
                                    </div>
                                  ) : (
                                    // Normal display for late/early/partial
                                    <>
                                      <div 
                                        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
                                        onClick={() => toggleExpanded(index)}
                                      >
                                        <div className="text-xs text-red-600 dark:text-red-400">Deduction Info</div>
                                        {(isLate || hasEarlyTimeout) && (
                                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                          </button>
                                        )}
                                      </div>
                                      {displayDeduction > 0 ? (
                                        <div className="text-lg font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                                          -{formatCurrency(displayDeduction)}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-muted-foreground">No deduction</div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Collapsible breakdown */}
                                  {!isAbsent && isExpanded && (isLate || hasEarlyTimeout) && (
                                    <div className="text-[11px] text-muted-foreground mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                      {isLate && lateMinutes > 0 && (
                                        <div className="text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                                          <div className="whitespace-nowrap">Late: +{Math.floor(lateMinutes / 60) > 0 ? `${Math.floor(lateMinutes / 60)}h ` : ''}{lateMinutes % 60}m</div>
                                          {lateDeduction > 0 && (
                                            <div className="text-red-600 dark:text-red-400 whitespace-nowrap font-bold">-{formatCurrency(lateDeduction)}</div>
                                          )}
                                        </div>
                                      )}
                                      {hasEarlyTimeout && earlyMinutes > 0 && (
                                        <div className="text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                                          <div className="whitespace-nowrap">Early: -{Math.floor(earlyMinutes / 60) > 0 ? `${Math.floor(earlyMinutes / 60)}h ` : ''}{earlyMinutes % 60}m</div>
                                          {earlyDeduction > 0 && (
                                            <div className="text-red-600 dark:text-red-400 whitespace-nowrap font-bold">-{formatCurrency(earlyDeduction)}</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Show inline for partial only (absent has its own display above) */}
                                  {!isExpanded && !isAbsent && isPartial && (
                                    <div className="text-[11px] text-muted-foreground mt-1">
                                      <div className="font-medium">Incomplete day</div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {detail.deduction === 0 && detail.status === 'PRESENT' && (
                                <div className="pt-2 border-t">
                                  <div className="text-xs text-green-600 dark:text-green-400 mb-1">Perfect!</div>
                                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                    No Deductions
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            )
          })()}

          {/* Loan & Deduction Details */}
          {mergedLoans.length > 0 && (() => {
            const loans = mergedLoans.filter((item: any) => !item.type?.startsWith('[DEDUCTION]'))
            const deductions = mergedLoans.filter((item: any) => item.type?.startsWith('[DEDUCTION]'))
            
            return (
              <>
                {/* Loans Section */}
                {loans.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <TrendingDown className="h-5 w-5" />
                          Loan Payments
                        </CardTitle>
                        <Badge variant="secondary">
                          {loans.length} loan(s)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Loan Purpose</TableHead>
                              <TableHead className="text-right">Payment Amount</TableHead>
                              <TableHead className="text-right">Remaining Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loans.map((loan, index) => (
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

                {/* Deductions Section */}
                {deductions.length > 0 && (
                  <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-800 dark:text-orange-300">
                          <TrendingDown className="h-5 w-5" />
                          Deduction Payments
                        </CardTitle>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          {deductions.length} deduction(s)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-orange-100 dark:bg-orange-900/50">
                              <TableHead className="font-semibold text-orange-800 dark:text-orange-300">Deduction Purpose</TableHead>
                              <TableHead className="text-right font-semibold text-orange-800 dark:text-orange-300">Payment Amount</TableHead>
                              <TableHead className="text-right font-semibold text-orange-800 dark:text-orange-300">Remaining Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deductions.map((deduction, index) => (
                              <TableRow key={index} className="hover:bg-orange-50 dark:hover:bg-orange-900/30">
                                <TableCell className="font-medium">{deduction.type.replace('[DEDUCTION] ', '')}</TableCell>
                                <TableCell className="text-right text-red-600 dark:text-red-400 font-semibold">
                                  -{formatCurrency(deduction.amount)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(deduction.remainingBalance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )
          })()}

          {/* Mandatory Deductions */}
          {mandatoryDeductions.length > 0 && (
            <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                    <AlertCircle className="h-6 w-6" />
                    Mandatory Deductions
                    <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">
                      Required by Law
                    </Badge>
                  </CardTitle>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">
                      {formatCurrency(totalMandatoryDeductions)}
                    </div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400">
                      Total Mandatory Deductions
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-indigo-100 dark:bg-indigo-900/50">
                        <TableHead className="font-semibold text-indigo-800 dark:text-indigo-300">Type</TableHead>
                        <TableHead className="font-semibold text-indigo-800 dark:text-indigo-300">Description</TableHead>
                        <TableHead className="font-semibold text-indigo-800 dark:text-indigo-300">Calculation</TableHead>
                        <TableHead className="text-right font-semibold text-indigo-800 dark:text-indigo-300">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mandatoryDeductions.map((deduction, index) => (
                        <TableRow key={index} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                          <TableCell className="font-medium">{deduction.type}</TableCell>
                          <TableCell className="text-muted-foreground">{deduction.description || 'Mandatory payroll deduction'}</TableCell>
                          <TableCell>
                            {deduction.calculationType === 'PERCENTAGE' && deduction.percentageValue ? (
                              <div className="text-sm">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  {deduction.percentageValue}%
                                </span>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {deduction.percentageValue}% of {formatCurrency(entry.breakdown.monthlyBasicSalary || entry.breakdown.basicSalary * 2)}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                Fixed
                              </span>
                            )}
                          </TableCell>
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

          {/* Other Deductions */}
          {otherDeductionsOnly.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Other Deductions
                  </CardTitle>
                  <Badge variant="secondary">
                    {formatCurrency(totalOtherDeductions)}
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
                      {otherDeductionsOnly.map((deduction, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{deduction.type}</TableCell>
                          <TableCell className="text-muted-foreground">{deduction.description || 'Other deduction'}</TableCell>
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
