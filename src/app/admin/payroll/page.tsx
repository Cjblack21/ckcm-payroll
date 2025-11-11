'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, Clock, Banknote, FileText, Archive, Printer, Download, Settings, Save, Eye, CheckCircle2, Trash2, CheckSquare, Square, MoreVertical, Search, X, AlertCircle, Users, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getPayrollSummary, releasePayrollWithAudit, generatePayslips } from '@/lib/actions/payroll'
import { getCurrentDayAttendance } from '@/lib/actions/attendance'
import { 
  toPhilippinesDateString, 
  calculatePeriodDurationInPhilippines,
  formatDateForDisplay,
  calculateWorkingDaysInPhilippines 
} from '@/lib/timezone'
import { Label } from '@/components/ui/label'
import PayrollBreakdownDialog from '@/components/payroll/PayrollBreakdownDialog'
import ArchivedPayrollDetailsDialog from '@/components/payroll/ArchivedPayrollDetailsDialog'

// Types
type PayrollEntry = {
  users_id: string
  name: string
  email: string
  avatar?: string | null
  personnelType?: string
  personnelTypeCategory?: 'TEACHING' | 'NON_TEACHING' | null
  department?: string | null
  totalWorkHours: number
  finalNetPay: number
  totalSalary?: number // Net pay from backend calculation
  status: 'Pending' | 'Released' | 'Archived'
  breakdown: {
    basicSalary: number
    monthlyBasicSalary?: number // Monthly reference (optional)
    overloadPay?: number // Total additional pay
    overloadPayDetails?: Array<{type: string, amount: number}> // Additional pay breakdown by type
    attendanceDeductions: number
    loanDeductions: number
    otherDeductions: number
    netPay?: number // Calculated net pay from backend
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
  totalGrossSalary: number
  totalExpenses: number
  totalDeductions: number
  totalAttendanceDeductions: number
  totalDatabaseDeductions: number
  totalLoanPayments: number
  totalNetPay: number
  releasedAt: string
  releasedBy: string
  archivedAt: string
  payrolls?: any[] // Individual personnel payroll entries
}

// Live Today Attendance Status Component
function LiveTodayAttendance({ userId }: { userId: string }) {
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTodayAttendance() {
      try {
        const result = await getCurrentDayAttendance()
        if (result.success && result.attendance) {
          const todayRecord = result.attendance.find((record: any) => record.users_id === userId)
          setStatus(todayRecord?.status || null)
        }
      } catch (error) {
        console.error('Error fetching today attendance:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTodayAttendance()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodayAttendance, 30000)
    return () => clearInterval(interval)
  }, [userId])

  if (loading) {
    return <span className="text-xs text-muted-foreground">Loading...</span>
  }

  if (!status) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const statusConfig = {
    'PRESENT': { color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/30 dark:text-green-400', label: 'Present' },
    'LATE': { color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400', label: 'Late' },
    'ABSENT': { color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-400', label: 'Absent' },
    'PENDING': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400', label: 'Pending' },
    'PARTIAL': { color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/30 dark:text-purple-400', label: 'Partial' },
  } as const

  const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status }

  return (
    <Badge className={`${config.color} border font-medium text-xs px-2 py-0.5`}>
      {config.label}
    </Badge>
  )
}

// Live Work Hours Component
function LiveWorkHours({ userId, totalWorkHours, now }: { userId: string; totalWorkHours: number; now: Date }) {
  const [attendanceData, setAttendanceData] = useState<{ timeIn: string | null; timeOut: string | null; status: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTodayAttendance() {
      try {
        const result = await getCurrentDayAttendance()
        console.log(`🔍 Fetching attendance for user ${userId}`)
        console.log(`🔍 Total records:`, result.attendance?.length)
        console.log(`🔍 All records:`, result.attendance?.map((r: any) => ({
          user: r.users_id,
          status: r.status,
          date: r.date
        })))
        
        if (result.success && result.attendance) {
          // Just find this user's record - getCurrentDayAttendance only returns today's records
          const todayRecord = result.attendance.find((record: any) => record.users_id === userId)
          
          console.log(`🔍 Looking for user ${userId} in ${result.attendance.length} records`)
          
          console.log(`📊 LiveWorkHours for user ${userId}:`, todayRecord)
          setAttendanceData({
            timeIn: todayRecord?.timeIn ? String(todayRecord.timeIn) : null,
            timeOut: todayRecord?.timeOut ? String(todayRecord.timeOut) : null,
            status: todayRecord?.status || null
          })
        }
      } catch (error) {
        console.error('Error fetching attendance:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTodayAttendance()
  }, [userId])

  const liveHours = useMemo(() => {
    if (!attendanceData?.timeIn || attendanceData?.timeOut) return null
    
    const timeIn = new Date(attendanceData.timeIn)
    const diffMs = now.getTime() - timeIn.getTime()
    return diffMs / (1000 * 60 * 60) // Convert to hours
  }, [attendanceData, now])

  const formatWorkHours = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`
  }

  const formatLiveTime = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours % 1) * 60)
    const s = Math.floor(((hours % 1) * 60 % 1) * 60)
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  // Debug log the status
  console.log(`📊 Rendering status for user ${userId}:`, attendanceData?.status)

  // Show ABSENT status - just show a dash
  if (attendanceData?.status === 'ABSENT') {
    return (
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">—</span>
      </div>
    )
  }

  // Show PENDING status
  if (attendanceData?.status === 'PENDING' || !attendanceData?.timeIn) {
    return (
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">—</span>
      </div>
    )
  }

  // Show LIVE counter if clocked in but not out
  if (liveHours !== null) {
    return (
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4 text-green-600" />
        <span className="font-mono font-bold text-green-600 tabular-nums">
          {formatLiveTime(liveHours)}
        </span>
        <span className="text-green-500 text-xs animate-pulse ml-1">● LIVE</span>
      </div>
    )
  }

  // Show completed work hours
  return (
    <div className="flex items-center gap-1">
      <Clock className="h-4 w-4 text-muted-foreground" />
      {formatWorkHours(totalWorkHours)}
    </div>
  )
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
  const [breakdownDialogOpen, setBreakdownDialogOpen] = useState(false)
  const [liveDeductions, setLiveDeductions] = useState<any[]>([])
  const [deductionTypes, setDeductionTypes] = useState<any[]>([])
  const [todayAttendanceMap, setTodayAttendanceMap] = useState<Map<string, string>>(new Map())
  const [personnelTypesMap, setPersonnelTypesMap] = useState<Map<string, any>>(new Map())
  
  // Reschedule state
  const [nextPeriodType, setNextPeriodType] = useState('Semi-Monthly')
  const [nextPeriodStart, setNextPeriodStart] = useState('')
  const [nextPeriodEnd, setNextPeriodEnd] = useState('')
  const [nextPeriodNotes, setNextPeriodNotes] = useState('')
  
  // Payroll Time Settings state
  const [payrollPeriodStart, setPayrollPeriodStart] = useState('')
  const [payrollPeriodEnd, setPayrollPeriodEnd] = useState('')
  const [payrollReleaseTime, setPayrollReleaseTime] = useState('17:00')
  const [originalReleaseTime, setOriginalReleaseTime] = useState('17:00') // Store original time-out end time
  const [savingPeriod, setSavingPeriod] = useState(false)
  const [canRelease, setCanRelease] = useState(false)
  const [settingsCustomDays, setSettingsCustomDays] = useState('')
  const [timeUntilRelease, setTimeUntilRelease] = useState('')
  const [customSeconds, setCustomSeconds] = useState('10')
  const [now, setNow] = useState(new Date())
  const [hasShownReleaseModal, setHasShownReleaseModal] = useState(false)
  const [hasAutoReleased, setHasAutoReleased] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState<'all' | 'single'>('all')
  const [previewSearch, setPreviewSearch] = useState('')
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const [selectedArchives, setSelectedArchives] = useState<string[]>([])
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [archivedBreakdownOpen, setArchivedBreakdownOpen] = useState(false)
  const [selectedArchivedPeriod, setSelectedArchivedPeriod] = useState<any>(null)
  const [archivedPersonnelList, setArchivedPersonnelList] = useState<any[]>([])
  const [selectedArchivedEntry, setSelectedArchivedEntry] = useState<any>(null)
  const [selectedPersonnelForPeriods, setSelectedPersonnelForPeriods] = useState<any>(null)
  const [showDeleteArchiveModal, setShowDeleteArchiveModal] = useState(false)
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('')
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('')
  const [periodSearchTerm, setPeriodSearchTerm] = useState('')
  const [archivedBreakdownSearchTerm, setArchivedBreakdownSearchTerm] = useState('')
  const [newArchivedPayrollId, setNewArchivedPayrollId] = useState<string | null>(null)
  const [showArchiveNotification, setShowArchiveNotification] = useState(false)
  const [hasViewedNewestPayroll, setHasViewedNewestPayroll] = useState(false)
  const todayPHString = useMemo(() => toPhilippinesDateString(new Date()), [])
  const readyToGenerate = useMemo(
    () => !!payrollPeriodStart && !!payrollPeriodEnd && !hasGeneratedForSettings,
    [payrollPeriodStart, payrollPeriodEnd, hasGeneratedForSettings]
  )

  // Pan/Drag handlers for free view
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const resetPan = () => {
    setPanPosition({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setPreviewScale(s => Math.max(0.5, Math.min(2.5, Number((s + delta).toFixed(2)))))
    }
  }

  // Utility: inject CSS to remove scrollbars/margins in preview HTML
  const injectPreviewStyles = (html: string) => {
    const style = `\n<style>
html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
/* Hide scrollbars - Chromium/WebKit */
::-webkit-scrollbar { width: 0 !important; height: 0 !important; background: transparent !important; }
::-webkit-scrollbar-thumb { background: transparent !important; }
/* Hide scrollbars - Firefox */
* { scrollbar-width: none !important; }
@page { margin: 0 !important; }
</style>\n`;
    if (!html) return html
    return html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : `${style}${html}`
  }

  // Remove any auto-print scripts from HTML when previewing
  const sanitizeForPreview = (html: string) => {
    if (!html) return html
    // Remove any <script> tags (prevents window.print on load)
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
  }

  // Load live deductions for accurate net pay calculations
  const loadLiveDeductions = async () => {
    try {
      const response = await fetch(`/api/admin/deductions?_t=${Date.now()}`)
      if (response.ok) {
        const allDeductions = await response.json()
        const activeDeductions = allDeductions.filter((d: any) => !d.archivedAt)
        setLiveDeductions(activeDeductions)
        console.log('🔍 Loaded live deductions:', activeDeductions.length)
      }
    } catch (error) {
      console.error('Error loading live deductions:', error)
    }
  }

  // Load deduction types for mandatory flag lookup
  const loadDeductionTypes = async () => {
    try {
      const response = await fetch('/api/admin/deduction-types')
      if (response.ok) {
        const types = await response.json()
        setDeductionTypes(types)
        console.log('🔍 Loaded deduction types:', types.length)
      }
    } catch (error) {
      console.error('Error loading deduction types:', error)
    }
  }

  // Load personnel types for department and position info
  const loadPersonnelTypes = async () => {
    try {
      const response = await fetch('/api/personnel-types')
      if (response.ok) {
        const types = await response.json()
        const map = new Map()
        types.forEach((type: any) => {
          map.set(type.personnel_types_id, {
            name: type.name,
            type: type.type,
            department: type.department
          })
        })
        setPersonnelTypesMap(map)
        console.log('🔍 Loaded personnel types:', types.length)
      }
    } catch (error) {
      console.error('Error loading personnel types:', error)
    }
  }

  // NO LOADING NEEDED - Just use payrollEntries directly!

  // Load payroll data
  const loadPayrollData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading payroll data...')
      const result = await getPayrollSummary()
      
      console.log('🔍 Payroll result:', result)
      
      if (!result.success) {
        console.error('❌ Payroll load failed:', result.error)
        throw new Error(result.error || 'Failed to load payroll data')
      }

      // Fetch mandatory deductions ONCE for all entries
      let mandatoryDeductions: any[] = []
      try {
        const res = await fetch('/api/admin/deduction-types')
        if (res.ok) {
          const types = await res.json()
          mandatoryDeductions = types.filter((t: any) => t.isMandatory && t.isActive).map((t: any) => ({
            type: t.name,
            amount: Number(t.amount),
            description: t.description || 'Mandatory deduction',
            isMandatory: true
          }))
          console.log('🔍 Fetched mandatory deductions:', mandatoryDeductions)
        }
      } catch (e) {
        console.error('Failed to fetch mandatory deductions:', e)
      }
      
      // Transform data to match our type
      console.log('🔍 Payroll Frontend Debug - Raw data:', result.summary?.payrollEntries)
      
      // Fetch users with personnel type data
      let usersPersonnelData = new Map<string, any>()
      try {
        const usersResponse = await fetch('/api/admin/users-with-types')
        if (usersResponse.ok) {
          const users = await usersResponse.json()
          users.forEach((user: any) => {
            if (user.personnelType) {
              usersPersonnelData.set(user.users_id, {
                department: user.personnelType.department,
                position: user.personnelType.name,
                type: user.personnelType.type
              })
            }
          })
          console.log('🔍 Loaded users with personnel data:', usersPersonnelData.size)
        }
      } catch (e) {
        console.error('Failed to fetch users:', e)
      }

      // Fetch overload pays from API (same as admin/deduction page)
      let overloadPaysByUser = new Map<string, number>()
      let overloadPayDetailsByUser = new Map<string, Array<{type: string, amount: number}>>()
      try {
        const overloadResponse = await fetch('/api/admin/overload-pay')
        if (overloadResponse.ok) {
          const overloadPays = await overloadResponse.json()
          console.log('💰 Fetched overload pays:', overloadPays)
          
          // Sum overload pays by user and store details by type
          overloadPays.forEach((op: any) => {
            const current = overloadPaysByUser.get(op.users_id) || 0
            overloadPaysByUser.set(op.users_id, current + Number(op.amount))
            
            // Store details with type
            const details = overloadPayDetailsByUser.get(op.users_id) || []
            details.push({
              type: op.type || 'OVERTIME',
              amount: Number(op.amount)
            })
            overloadPayDetailsByUser.set(op.users_id, details)
          })
          
          console.log('💰 Overload pays by user:', Array.from(overloadPaysByUser.entries()).map(([id, amt]) => `${id}: ₱${amt}`))
        }
      } catch (e) {
        console.error('Failed to fetch overload pays:', e)
      }

      const entries: PayrollEntry[] = (result.summary?.payrollEntries || []).map((entry: any) => {
        console.log(`🔍 Payroll Entry Debug - User: ${entry.name}, Basic Salary: ₱${entry.personnelType?.basicSalary}, Gross: ₱${entry.grossSalary}, Total Deductions: ₱${entry.totalDeductions}, totalAdditions: ₱${entry.totalAdditions}, Net: ₱${entry.netSalary}`)
        console.log(`🔍 Deduction Details - User: ${entry.name}:`, entry.deductionDetails?.map((d: any) => `${d.type}: ₱${d.amount}`))
        console.log(`🔍 Other Deductions - User: ${entry.name}:`, entry.deductionDetails?.filter((d: any) => 
          !d.type.includes('Late') && 
          !d.type.includes('Absent') &&
          !d.type.includes('Early') &&
          !d.type.includes('Tardiness') &&
          !d.type.includes('Partial')
        ).map((d: any) => `${d.type}: ₱${d.amount}`))

        // Use grossSalary (semi-monthly) as the base, not the monthly basicSalary
        const monthlyBasicSalary = Number(entry?.personnelType?.basicSalary ?? 0) // Monthly reference
        const grossSalary = Number(entry?.grossSalary ?? 0) // Semi-monthly (already divided by 2)
        const overloadPayAmount = overloadPaysByUser.get(entry.users_id) || Number(entry?.totalAdditions ?? 0)
        const attendanceDeductions = Number(entry?.attendanceDeductions ?? 0)
        const loanDeductions = Number(entry?.loanPayments ?? 0)
        const otherDeductions = Number(entry?.databaseDeductions ?? 0)
        
        // Calculate actual net pay: gross + overload - all deductions
        const actualGrossPay = grossSalary + overloadPayAmount
        const totalDeductions = attendanceDeductions + loanDeductions + otherDeductions
        const computedNet = actualGrossPay - totalDeductions
        
        // Always use computedNet to match the dialog calculation
        const finalNet = computedNet
        
        console.log(`💰 Net Pay Calculation - ${entry.name}:`, {
          monthlyBasicSalary,
          grossSalary,
          overloadPayAmount,
          actualGrossPay,
          attendanceDeductions,
          loanDeductions,
          otherDeductions,
          totalDeductions,
          computedNet,
          finalNet,
          rawEntry: entry
        })

        // Get personnel type info from fetched user data
        const userData = usersPersonnelData.get(entry.users_id)
        
        return {
          users_id: entry.users_id,
          name: entry.name,
          email: entry.email,
          personnelType: userData?.position || entry.personnelType?.name || 'N/A',
          personnelTypeCategory: userData?.type || entry.personnelType?.type || null,
          department: userData?.department || entry.personnelType?.department || null,
          totalWorkHours: Number(entry.totalWorkHours ?? 0),
          finalNetPay: finalNet, // Actual net pay including overload and all deductions
          status: entry.status || 'Pending',
          breakdown: {
            basicSalary: monthlyBasicSalary / 2, // Semi-monthly base salary (₱10,000) - MATCHES PAYSLIP
            monthlyBasicSalary, // Monthly reference for display (₱20,000)
            overloadPay: overloadPaysByUser.get(entry.users_id) || Number(entry?.totalAdditions ?? 0), // Overload pay (₱8,000)
            overloadPayDetails: overloadPayDetailsByUser.get(entry.users_id) || [], // Additional pay details with types
            attendanceDeductions, // Real-time calculated attendance deductions
            loanDeductions,
            otherDeductions, // Database deductions (Philhealth, SSS, etc.)
            attendanceDetails: entry.attendanceRecords?.map((record: any) => ({
              date: record.date,
              timeIn: record.timeIn,
              timeOut: record.timeOut,
              workHours: Number(record.workHours ?? 0),
              status: record.status,
              deduction: Number(record.deductions ?? 0)
            })) || [],
            loanDetails: entry.loanDetails?.map((loan: any) => ({
              type: loan.purpose || 'Loan',
              amount: Number(loan.payment ?? 0),
              remainingBalance: Number(loan.balance ?? 0)
            })) || [],
            otherDeductionDetails: (() => {
              // Get existing deductions from entry - use isMandatory flag from backend
              const filtered = entry.deductionDetails?.filter((deduction: any) => {
                // Only include non-attendance deductions (like Philhealth, SSS, etc.)
                return !deduction.type.includes('Late') && 
                       !deduction.type.includes('Absent') &&
                       !deduction.type.includes('Early') &&
                       !deduction.type.includes('Tardiness') &&
                       !deduction.type.includes('Partial')
              }).map((deduction: any) => ({
                type: deduction.type,
                amount: Number(deduction.amount ?? 0),
                description: deduction.description || '',
                isMandatory: deduction.isMandatory ?? false // Use flag from backend
              })) || []
              
              console.log(`🎯 BREAKDOWN DATA for ${entry.name} - RAW deductionDetails:`, entry.deductionDetails)
              console.log(`🎯 BREAKDOWN DATA for ${entry.name} - FILTERED otherDeductionDetails:`, filtered.map((d: { type: string, amount: number, description: string, isMandatory: boolean }) => `${d.type}: ₱${d.amount} (Mandatory: ${d.isMandatory})`))
              console.log(`🎯 MANDATORY count: ${filtered.filter((d: { type: string, amount: number, description: string, isMandatory: boolean }) => d.isMandatory).length}, OTHER count: ${filtered.filter((d: { type: string, amount: number, description: string, isMandatory: boolean }) => !d.isMandatory).length}`)
              return filtered
            })()
          }
        }
      })

      setPayrollEntries(entries)
      // Current Payroll Period should show the actual payroll period being displayed
      // Use the summary period (actual payroll data) for display
      setCurrentPeriod({
        periodStart: result.summary?.periodStart || result.summary?.settings?.periodStart || '',
        periodEnd: result.summary?.periodEnd || result.summary?.settings?.periodEnd || '',
        type: 'Semi-Monthly',
        status: (result.summary as any)?.status || (entries.length > 0 ? entries[0].status : 'Pending')
      })
      // Set payroll period settings
      setPayrollPeriodStart(result.summary?.settings?.periodStart || '')
      setPayrollPeriodEnd(result.summary?.settings?.periodEnd || '')
      // Use time-out end time as release time (automatic)
      const releaseTime = result.summary?.settings?.timeOutEnd || '17:00'
      setPayrollReleaseTime(releaseTime)
      setOriginalReleaseTime(releaseTime) // Store the original automatic time
      // Use settings.hasGeneratedForSettings to control Generate button state
      const generatedState = !!result.summary?.settings?.hasGeneratedForSettings
      console.log('🔍 Payroll UI Debug - hasGeneratedForSettings:', generatedState)
      console.log('🔍 Payroll UI Debug - Settings period:', result.summary?.settings?.periodStart, 'to', result.summary?.settings?.periodEnd)
      console.log('🔍 Payroll UI Debug - Payroll entries count:', entries.length)
      setHasGeneratedForSettings(generatedState)
      
      // Check release status and send notifications if needed
      if (result.summary?.settings?.periodEnd) {
        try {
          const checkResponse = await fetch('/api/admin/payroll/check-release', {
            method: 'POST'
          })
          if (checkResponse.ok) {
            const checkData = await checkResponse.json()
            setCanRelease(checkData.canRelease)
            if (checkData.releaseTime) {
              setPayrollReleaseTime(checkData.releaseTime)
            }
            console.log('🔍 Release Check - Can Release:', checkData.canRelease, 'Notification Sent:', checkData.notificationSent)
          }
        } catch (error) {
          console.error('Error checking release status:', error)
          setCanRelease(false)
        }
      } else {
        setCanRelease(false)
      }
    } catch (error) {
      console.error('❌ Error loading payroll data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load payroll data'
      console.error('❌ Error details:', errorMessage)
      toast.error(`Failed to load payroll: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Automatic release function (called when countdown hits zero)
  const handleAutoReleasePayroll = async () => {
    try {
      setLoading(true)
      toast.loading('Auto-releasing payroll...', { id: 'auto-release-payroll' })

      // Calculate next period dates automatically
      let calculatedNextStart = ''
      let calculatedNextEnd = ''
      
      if (currentPeriod?.periodStart && currentPeriod?.periodEnd) {
        const start = new Date(currentPeriod.periodStart)
        const end = new Date(currentPeriod.periodEnd)
        const durationDays = calculatePeriodDurationInPhilippines(start, end)
        const nextStart = new Date(end)
        nextStart.setDate(end.getDate() + 1)
        const nextEnd = new Date(nextStart)
        nextEnd.setDate(nextStart.getDate() + durationDays - 1)
        
        calculatedNextStart = toPhilippinesDateString(nextStart)
        calculatedNextEnd = toPhilippinesDateString(nextEnd)
      }

      // Release payroll with auto-calculated next period
      const result = await releasePayrollWithAudit(calculatedNextStart, calculatedNextEnd)
      if (!result.success) {
        throw new Error(result.error || 'Failed to auto-release payroll')
      }

      toast.success(`🎉 Payroll auto-released successfully for ${result.releasedCount} employees! You can now print payslips.`, { id: 'auto-release-payroll' })

      // Update UI state
      setPayrollEntries(prevEntries => 
        prevEntries.map(entry => ({
          ...entry,
          status: 'Released' as const
        }))
      )

      setCurrentPeriod(prevPeriod => prevPeriod ? {
        ...prevPeriod,
        status: 'Released'
      } : null)

      setHasGeneratedForSettings(false)
      setHasAutoReleased(false) // Reset for next period
      
      // Don't reload immediately - keep showing the released period so Print button works
      console.log('✅ Payroll auto-released! Current period status is now Released.')
      
      // Show print prompt (modal + native fallback)
      promptPrintPayslips()
      
    } catch (error) {
      console.error('Error auto-releasing payroll:', error)
      toast.error(`Failed to auto-release payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'auto-release-payroll' })
    } finally {
      // Delay loading false to ensure modal has time to render
      setTimeout(() => setLoading(false), 100)
    }
  }

  // Release payroll - automatically calculate next period dates
  const handleReleasePayroll = async () => {
    try {
      setLoading(true)
      toast.loading('Releasing payroll...', { id: 'release-payroll' })
      
      // Auto-calculate next period dates based on current period duration
      let nextStart = ''
      let nextEnd = ''
      
      if (currentPeriod?.periodStart && currentPeriod?.periodEnd) {
        const start = new Date(currentPeriod.periodStart)
        const end = new Date(currentPeriod.periodEnd)
        const durationDays = calculatePeriodDurationInPhilippines(start, end)
        const nextStartDate = new Date(end)
        nextStartDate.setDate(end.getDate() + 1)
        const nextEndDate = new Date(nextStartDate)
        nextEndDate.setDate(nextStartDate.getDate() + durationDays - 1)
        
        nextStart = toPhilippinesDateString(nextStartDate)
        nextEnd = toPhilippinesDateString(nextEndDate)
        
        console.log('🔍 AUTO RELEASE - Period calculation:', {
          currentStart: start.toISOString(),
          currentEnd: end.toISOString(),
          durationDays,
          nextStart: nextStartDate.toISOString(),
          nextEnd: nextEndDate.toISOString(),
          nextStartString: nextStart,
          nextEndString: nextEnd
        })
      }
      
      // Release with auto-calculated dates
      const result = await releasePayrollWithAudit(nextStart, nextEnd)
      if (!result.success) {
        throw new Error(result.error || 'Failed to release payroll')
      }

      toast.success(`Payroll released successfully for ${result.releasedCount} employees! You can now print payslips.`, { id: 'release-payroll' })
      
      // Show notification about new archived payroll
      toast.success('New archived payroll ready to be printed!', { duration: 5000 })
      
      // Set notification badge flag
      console.log('🔴 SETTING showArchiveNotification to TRUE after release')
      setShowArchiveNotification(true)
      setHasViewedNewestPayroll(false) // Reset when new payroll is released
      localStorage.setItem('hasNewArchivedPayroll', 'true') // Set sidebar notification
      
      // Auto-update payroll period settings with the new period dates (for next generation)
      setPayrollPeriodStart(nextStart)
      setPayrollPeriodEnd(nextEnd)
      
      // Note: We keep currentPeriod showing the released period so Print button stays enabled
      // When user generates new payroll, it will load the next period

      // Update the status of existing payroll entries to "Released"
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

      // Reset states
      setHasGeneratedForSettings(false)
      setTimeUntilRelease('')
      setCanRelease(false)
      setHasShownReleaseModal(false)
      setHasAutoReleased(false) // Reset for next period
      
      // Don't reload immediately - keep showing the released period so Print button works
      // User needs to generate new payroll to see the next period
      console.log('✅ Payroll released! Current period status is now Released.')
      
      // Load archived payrolls to get the newly created archive
      // Add a small delay to ensure the archive is created in the database
      setTimeout(async () => {
        try {
          const res = await fetch('/api/admin/payroll/archived')
          if (res.ok) {
            const data = await res.json()
            console.log('🔔 Notification Debug - Archived payrolls data:', data)
            if (data.success && data.archivedPayrolls && data.archivedPayrolls.length > 0) {
              // Set the most recent archived payroll as new
              const newId = data.archivedPayrolls[0].id
              console.log('🔔 Setting new archived payroll ID:', newId)
              setNewArchivedPayrollId(newId)
              console.log('🔔 State should now show red dot for ID:', newId)
            } else {
              console.log('🔔 No archived payrolls found or data not successful')
            }
          } else {
            console.log('🔔 Fetch archived payrolls failed with status:', res.status)
          }
        } catch (error) {
          console.error('🔔 Error fetching archived payrolls:', error)
        }
      }, 500)
      
      // Show print prompt (modal + native fallback)
      promptPrintPayslips()
      
    } catch (error) {
      console.error('Error releasing payroll:', error)
      toast.error(`Failed to release payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'release-payroll' })
    } finally {
      // Delay loading false to ensure modal has time to render
      setTimeout(() => setLoading(false), 100)
    }
  }

  // Archive released payroll
  const handleArchivePayroll = async () => {
    try {
      if (!currentPeriod?.periodStart || !currentPeriod?.periodEnd) {
        toast.error('No payroll period found to archive')
        return
      }

      if (currentPeriod.status !== 'Released') {
        toast.error('Only released payroll can be archived')
        return
      }

      setLoading(true)
      toast.loading('Archiving payroll...', { id: 'archive-payroll' })

      const res = await fetch('/api/admin/payroll/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: currentPeriod.periodStart,
          periodEnd: currentPeriod.periodEnd
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to archive payroll')
      }

      toast.success(`Payroll archived successfully for ${data.archivedCount} employees!`, { id: 'archive-payroll' })

      // Reload data to update UI
      await loadPayrollData()

    } catch (error) {
      console.error('Error archiving payroll:', error)
      toast.error(`Failed to archive payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'archive-payroll' })
    } finally {
      setLoading(false)
    }
  }

  // Generate payroll entries for current period
  const handleGeneratePayroll = async () => {
    try {
      setLoading(true)
      setHasShownReleaseModal(true) // Prevent countdown from showing modal during generation
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
        setHasShownReleaseModal(false) // Reset modal flag for new period
        // Show helpful message if there were released entries that got archived
        if (payrollEntries.some(entry => entry.status === 'Released')) {
          toast.success('Previous released payroll has been moved to archive', { duration: 3000 })
        }
      }, 100)
      
    } catch (error) {
      console.error('Error generating payroll:', error)
      toast.error(`Failed to generate payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'generate-payroll' })
      setHasShownReleaseModal(false) // Reset on error
    } finally {
      setLoading(false)
    }
  }

  // Generate payslips and show preview modal
  const handleGeneratePayslips = async (options?: { bypassReleaseCheck?: boolean }) => {
    try {
      console.log('🖨️ Print Payslips button clicked!')
      
      if (!currentPeriod?.periodStart || !currentPeriod?.periodEnd) {
        toast.error('No payroll period found. Please generate payroll first.', { id: 'generate-payslips' })
        console.error('❌ Missing period data:', currentPeriod)
        return
      }

      if (!options?.bypassReleaseCheck && currentPeriod?.status !== 'Released') {
        toast.error('Payroll must be released before printing payslips.', { id: 'generate-payslips' })
        console.error('❌ Payroll not released. Status:', currentPeriod?.status)
        return
      }

      setLoading(true)
      toast.loading('Generating payslips for Long Bond Paper...', { id: 'generate-payslips' })
      
      console.log('🔍 Generate Payslips Debug:', {
        currentPeriod,
        payrollEntries: payrollEntries.length,
        releasedEntries: payrollEntries.filter(e => e.status === 'Released').length,
        statuses: payrollEntries.map(e => e.status)
      })

      // Use the screenshot route which has proper layout
      console.log('📡 Calling print-screenshot API...')
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
      
      console.log('📡 API Response status:', response.status, response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Payslip generation error - Status:', response.status, 'Response:', errorText)
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          console.error('Failed to parse error response as JSON')
        }
        throw new Error(errorData.error || errorData.details || `Failed to generate payslips (Status: ${response.status})`)
      }

      // Get the HTML content from the response and show preview modal
      const rawHtml = await response.text()
      const htmlContent = injectPreviewStyles(sanitizeForPreview(rawHtml))
      console.log('✅ Received HTML content, length:', htmlContent.length)
      setPreviewHtml(htmlContent)
      setShowPreviewModal(true)
      
      // Dismiss loading toast after preview opens
      toast.dismiss('generate-payslips')
      
      // Clear notification badge when user views the payslip
      console.log('🔔 Clearing notification - user opened payslip preview')
      setShowArchiveNotification(false)
      setNewArchivedPayrollId(null)
      localStorage.removeItem('hasNewArchivedPayroll')
    } catch (error) {
      console.error('Error generating payslips:', error)
      toast.error(`Failed to generate payslips: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'generate-payslips', duration: 5000 })
    } finally {
      setLoading(false)
    }
  }


  // Load archived payrolls
  const loadArchivedPayrolls = async () => {
    try {
      console.log('🔄 Loading archived payrolls...')
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
      console.log('✅ Loaded archived payrolls:', data.archivedPayrolls?.length)
      console.log('📦 First payroll has payrolls array?', !!data.archivedPayrolls?.[0]?.payrolls)
      console.log('📦 First payroll payrolls count:', data.archivedPayrolls?.[0]?.payrolls?.length)
      setArchivedPayrolls(data.archivedPayrolls || [])
    } catch (error) {
      console.error('Error loading archived payrolls:', error)
      // Set empty array instead of static data
      setArchivedPayrolls([])
    }
  }

  // Toggle select all archives
  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedArchives([])
      setIsSelectAll(false)
    } else {
      setSelectedArchives(archivedPayrolls.map(p => p.id))
      setIsSelectAll(true)
    }
  }

  // Toggle individual archive selection
  const handleToggleArchive = (id: string) => {
    setSelectedArchives(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(item => item !== id)
        setIsSelectAll(newSelection.length === archivedPayrolls.length)
        return newSelection
      } else {
        const newSelection = [...prev, id]
        setIsSelectAll(newSelection.length === archivedPayrolls.length)
        return newSelection
      }
    })
  }

  // Trigger bulk delete confirmation modal
  const promptBulkDeleteArchives = () => {
    if (selectedArchives.length === 0) {
      toast.error('Please select at least one archived payroll to delete')
      return
    }
    setShowDeleteArchiveModal(true)
  }

  // Delete multiple archived payrolls (after confirmation)
  const handleBulkDeleteArchives = async () => {
    setShowDeleteArchiveModal(false)
    
    try {
      setLoading(true)
      toast.loading(`Deleting ${selectedArchives.length} archived payroll(s)...`, { id: 'bulk-delete' })

      // Delete each selected archive
      const deletePromises = selectedArchives.map(async id => {
        try {
          const response = await fetch(`/api/admin/payroll/archive/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorData.details || errorMessage
              console.error(`Failed to delete ${id}:`, errorData)
            } catch {
              const text = await response.text().catch(() => '')
              errorMessage = text || errorMessage
              console.error(`Failed to delete ${id} (non-JSON):`, text)
            }
            return { success: false, id, error: errorMessage }
          }
          
          return { success: true, id }
        } catch (err) {
          console.error(`Error deleting ${id}:`, err)
          return { success: false, id, error: err instanceof Error ? err.message : 'Network error' }
        }
      })

      const results = await Promise.all(deletePromises)
      const failedDeletes = results.filter(r => !r.success)
      const successfulDeletes = results.filter(r => r.success)

      if (failedDeletes.length > 0) {
        console.error('Failed deletes:', failedDeletes)
        const firstError = failedDeletes[0].error
        throw new Error(`Failed to delete ${failedDeletes.length} payroll(s). First error: ${firstError}`)
      }

      toast.success(`Successfully deleted ${successfulDeletes.length} archived payroll(s)`, { id: 'bulk-delete' })
      setSelectedArchives([])
      setIsSelectAll(false)
      await loadArchivedPayrolls() // Refresh the list
    } catch (error) {
      console.error('Error bulk deleting archives:', error)
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bulk-delete' })
    } finally {
      setLoading(false)
    }
  }

  // Delete archived payroll
  const handleDeleteArchivedPayroll = async (payrollId: string, periodStart: string, periodEnd: string) => {
    if (!confirm(`Are you sure you want to delete the archived payroll for ${formatDateForDisplay(new Date(periodStart))} — ${formatDateForDisplay(new Date(periodEnd))}? This action cannot be undone.`)) {
      return
    }

    try {
      setLoading(true)
      toast.loading('Deleting archived payroll...', { id: 'delete-archive' })

      const response = await fetch(`/api/admin/payroll/archive/${payrollId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete archived payroll')
      }

      toast.success('Archived payroll deleted successfully', { id: 'delete-archive' })
      setSelectedArchives(prev => prev.filter(id => id !== payrollId))
      await loadArchivedPayrolls() // Refresh the list
    } catch (error) {
      console.error('Error deleting archived payroll:', error)
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'delete-archive' })
    } finally {
      setLoading(false)
    }
  }

  // Preview archived payslips for a given period
  const handlePreviewArchivedPayslips = async (periodStart: string, periodEnd: string) => {
    try {
      setLoading(true)
      toast.loading('Loading archived payslips...', { id: 'preview-archived' })
      const response = await fetch('/api/admin/payroll/print-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart, periodEnd })
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to load archived payslips')
      }
      const rawHtml = await response.text()
      const htmlContent = injectPreviewStyles(sanitizeForPreview(rawHtml))
      setPreviewHtml(htmlContent)
      setShowPreviewModal(true)
      toast.dismiss('preview-archived')
    } catch (e) {
      console.error('Error previewing archived payslips:', e)
      toast.error('Failed to preview archived payslips', { id: 'preview-archived' })
    } finally {
      setLoading(false)
    }
  }

  // Save payroll period settings
  const handleSavePayrollPeriod = async () => {
    try {
      setSavingPeriod(true)
      toast.loading('Saving payroll period...', { id: 'save-period' })

      // Validate dates
      const startDate = payrollPeriodStart ? new Date(payrollPeriodStart) : null
      const endDate = payrollPeriodEnd ? new Date(payrollPeriodEnd) : null
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates')
      }
      if (endDate < startDate) {
        throw new Error('End date cannot be before start date')
      }

      const response = await fetch('/api/admin/attendance-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: payrollPeriodStart,
          periodEnd: payrollPeriodEnd,
          payrollReleaseTime: payrollReleaseTime,
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

      // Validate dates
      const startDate = nextPeriodStart ? new Date(nextPeriodStart) : null
      const endDate = nextPeriodEnd ? new Date(nextPeriodEnd) : null
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates')
      }
      if (endDate < startDate) {
        throw new Error('End date cannot be before start date')
      }

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

  // Format time from 24-hour to 12-hour format
  const formatTime12Hour = (time24: string) => {
    if (!time24) return ''
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Format currency - exactly 2 decimal places
  const formatCurrency = (amount: number) => {
    // Handle NaN, null, undefined
    const safeAmount = Number.isFinite(amount) ? amount : 0
    return '₱' + new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      'Pending': 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      'Released': 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
    }
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-muted text-muted-foreground border-border'}>
        {status}
      </Badge>
    )
  }

  // Helper: merge cached deductions with live deductions (same logic as PayrollBreakdownDialog)
  const getMergedDeductions = (entry: PayrollEntry) => {
    const deductionsMap = new Map()
    
    // Add cached deductions from payroll snapshot
    entry.breakdown.otherDeductionDetails.forEach((d: any) => {
      deductionsMap.set(d.type.toLowerCase(), {
        type: d.type,
        amount: d.amount,
        description: d.description,
        isMandatory: d.isMandatory
      })
    })
    
    // Override/add with live deductions from database
    const userLiveDeductions = liveDeductions.filter((d: any) => d.users_id === entry.users_id)
    userLiveDeductions.forEach((d: any) => {
      const typeName = d.deductionType.name
      const typeNameLower = typeName.toLowerCase()
      
      // Skip attendance-related deductions
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
        isMandatory: d.deductionType.isMandatory
      })
    })
    
    return Array.from(deductionsMap.values())
  }

  // Helper: check if deduction is mandatory
  const isMandatoryDeduction = (deduction: any): boolean => {
    if (deduction.isMandatory === true || deduction.isMandatory === 1) {
      return true
    }
    
    if (deductionTypes.length > 0) {
      const deductionType = deductionTypes.find((t: any) => 
        t.name.toLowerCase() === deduction.type.toLowerCase()
      )
      if (deductionType) {
        return deductionType.isMandatory === true
      }
    }
    
    return false
  }
  
  // Load today's attendance for all users
  const loadTodayAttendance = async () => {
    try {
      const result = await getCurrentDayAttendance()
      if (result.success && result.attendance) {
        const map = new Map<string, string>()
        result.attendance.forEach((record: any) => {
          map.set(record.users_id, record.status)
        })
        setTodayAttendanceMap(map)
      }
    } catch (error) {
      console.error('Error loading today attendance:', error)
    }
  }
  
  // Helper: calculate today's absence deduction if applicable
  const getTodayAbsenceDeduction = (entry: PayrollEntry): number => {
    const todayStatus = todayAttendanceMap.get(entry.users_id)
    if (todayStatus === 'ABSENT') {
      // Check if today is not already in attendance records
      const todayString = new Date().toISOString().split('T')[0]
      const hasTodayRecord = entry.breakdown.attendanceDetails.some(d => d.date.startsWith(todayString))
      if (!hasTodayRecord) {
        return entry.breakdown.basicSalary / 11 // Daily rate
      }
    }
    return 0
  }

  // Filter entries based on search
  const filteredEntries = payrollEntries.filter(entry =>
    entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Update current time every second for live counters
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadPersonnelTypes()
    loadPayrollData()
    loadArchivedPayrolls()
    loadLiveDeductions()
    loadDeductionTypes()
    loadTodayAttendance()
    
    // Refresh today's attendance every 30 seconds
    const interval = setInterval(loadTodayAttendance, 30000)
    return () => clearInterval(interval)
  }, [])

  // Timer to update countdown every second
  useEffect(() => {
    if (!currentPeriod?.periodEnd || !payrollReleaseTime) {
      setTimeUntilRelease('')
      return
    }

    const updateCountdown = () => {
      // Get current time in Philippines (UTC+8)
      const now = new Date()
      const philippinesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      const [hours, minutes] = payrollReleaseTime.split(':').map(Number)
      
      // Use period end date with the release time
      const releaseDateTime = new Date(currentPeriod.periodEnd)
      releaseDateTime.setHours(hours, minutes, 0, 0)
      
      const diff = releaseDateTime.getTime() - philippinesTime.getTime()
      
      if (diff <= 0) {
        setTimeUntilRelease('Release available now!')
        if (!canRelease) {
          setCanRelease(true)
          console.log('🚀 Countdown complete - Release button now enabled')
          
          // Auto-release payroll when countdown hits zero (only once)
          if (hasGeneratedForSettings && currentPeriod.status !== 'Released' && !hasAutoReleased) {
            console.log('🚀 Auto-releasing payroll after cutoff...')
            setHasAutoReleased(true)
            handleAutoReleasePayroll()
          }
        }
        return
      }
      
      // If we're counting down, make sure canRelease is false
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
  }, [currentPeriod?.periodEnd, payrollReleaseTime, canRelease])

  // Debug: Log newArchivedPayrollId changes
  useEffect(() => {
    console.log('🔔 newArchivedPayrollId changed:', newArchivedPayrollId)
  }, [newArchivedPayrollId])
  
  // Debug: Log showArchiveNotification changes
  useEffect(() => {
    console.log('🔴 showArchiveNotification changed:', showArchiveNotification)
  }, [showArchiveNotification])

  // Load archived payrolls when archive tab is accessed
  useEffect(() => {
    if (activeTab === 'archived') {
      loadArchivedPayrolls()
    }
  }, [activeTab])
  
  // Clear notification ONLY when user opens archived tab and sees the content
  useEffect(() => {
    if (activeTab === 'archived' && archivedPayrolls.length > 0) {
      // Clear notification immediately when viewing archived payrolls
      setShowArchiveNotification(false)
      setNewArchivedPayrollId(null)
    }
  }, [activeTab, archivedPayrolls.length])

  // Debug modal state
  useEffect(() => {
    console.log('🔍 Modal state changed - showPrintModal:', showPrintModal)
  }, [showPrintModal])

  // Note: keep page scroll functional; we will hide scrollbars visually via CSS instead

  // Prompt to print payslips with modal
  const promptPrintPayslips = () => {
    setShowPrintModal(true)
  }

  // Periodic check for reminder notifications (every 30 minutes)
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const response = await fetch('/api/admin/payroll/check-release', { method: 'POST' })
        if (!response.ok) {
          // Fail silently for non-critical background checks
          return
        }
      } catch (error) {
        // Fail silently - this is a non-critical background check
        // No need to log or show errors to avoid console noise
      }
    }

    // Check immediately on mount
    checkReminders()

    // Then check every 30 minutes
    const interval = setInterval(checkReminders, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span className="text-2xl sm:text-3xl text-blue-600">₱</span>
            Payroll Management
          </h1>
          <p className="text-muted-foreground">
            Manage employee payroll, generate payslips, and track payroll history
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Workflow:</strong> Generate Payroll → Release Payroll → Print Payslips (optional)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePayroll} disabled={loading || hasGeneratedForSettings} aria-disabled>
            <FileText className="h-4 w-4 mr-2" />
            {hasGeneratedForSettings ? 'Payroll Generated' : 'Generate Payroll'}
          </Button>
          <Button 
            onClick={handleReleasePayroll} 
            disabled={loading || !hasGeneratedForSettings || currentPeriod?.status === 'Released' || !canRelease} 
            aria-disabled
            title={!canRelease && currentPeriod?.periodEnd && payrollReleaseTime ? `Release only available on or after ${formatDateForDisplay(new Date(currentPeriod.periodEnd))} at ${formatTime12Hour(payrollReleaseTime)}` : ''}
          >
            <Save className="h-4 w-4 mr-2" />
            {currentPeriod?.status === 'Released' ? 'Payroll Released' : !canRelease ? 'Release (Not Yet Period End)' : 'Release Payroll'}
          </Button>
        </div>
      </div>

      {/* Release Countdown Timer */}
      {!canRelease && currentPeriod && currentPeriod.status !== 'Released' && timeUntilRelease && hasGeneratedForSettings && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-8 border border-blue-100 dark:border-blue-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                <div className="relative bg-white dark:bg-gray-900 p-4 rounded-full shadow-lg">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Waiting for Release Time</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateForDisplay(new Date(currentPeriod.periodEnd))} at {formatTime12Hour(payrollReleaseTime)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Time Remaining</p>
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {timeUntilRelease}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Release Ready Banner */}
      {canRelease && currentPeriod && currentPeriod.status !== 'Released' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-8 border border-green-100 dark:border-green-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full"></div>
                <div className="relative bg-white dark:bg-gray-900 p-4 rounded-full shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Ready to Release</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can now release payroll to all employees
                </p>
              </div>
            </div>
            <Button 
              onClick={handleReleasePayroll}
              size="lg"
              className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={loading}
            >
              <Save className="h-5 w-5 mr-2" />
              Release Payroll
            </Button>
          </div>
        </div>
      )}

      {/* Current Period Info */}
      {currentPeriod && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Current Payroll Period</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDateForDisplay(new Date(currentPeriod.periodStart))} — {formatDateForDisplay(new Date(currentPeriod.periodEnd))}
                  </p>
                </div>
              </div>
              {getStatusBadge(currentPeriod.status || 'Pending')}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Employees */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-950/30 rounded">
                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Total Employees</span>
                </div>
                <p className="text-2xl font-bold">{payrollEntries.length}</p>
                <p className="text-xs text-muted-foreground">Active personnel</p>
              </div>

              {/* Period Duration */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-950/30 rounded">
                    <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium">Period Duration</span>
                </div>
                <p className="text-2xl font-bold">
                  {calculatePeriodDurationInPhilippines(new Date(currentPeriod.periodStart), new Date(currentPeriod.periodEnd))} days
                </p>
                <p className="text-xs text-muted-foreground">{currentPeriod.type} period</p>
              </div>

              {/* Payroll Summary Counts */}
              {payrollEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-950/30 rounded">
                      <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Payroll Items</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Additions</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {payrollEntries.reduce((sum: number, entry: any) => {
                          const hasOverload = (entry.breakdown?.overloadPayDetails?.length ?? 0) > 0
                          return sum + (hasOverload ? 1 : 0)
                        }, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deductions</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {payrollEntries.reduce((sum: number, entry: any) => {
                          const attendance = (entry.breakdown?.attendanceDetails?.length ?? 0)
                          const loans = (entry.breakdown?.loanDetails?.length ?? 0)
                          const mandatory = (entry.breakdown?.otherDeductionDetails?.filter((d: any) => d.isMandatory)?.length ?? 0)
                          const other = (entry.breakdown?.otherDeductionDetails?.filter((d: any) => !d.isMandatory)?.length ?? 0)
                          return sum + attendance + loans + mandatory + other
                        }, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Release Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="p-1.5 bg-orange-100 dark:bg-orange-950/30 rounded">
                    <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-medium">Release Status</span>
                </div>
                <div className="space-y-1">
                  {hasGeneratedForSettings ? (
                    <>
                      <Badge className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800 text-sm">
                        ✓ Generated
                      </Badge>
                      {currentPeriod?.status === 'Released' ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Released & ready to print</p>
                      ) : canRelease ? (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Ready to release now</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Waiting for period end</p>
                      )}
                    </>
                  ) : (
                    <>
                      <Badge className="bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 text-sm">
                        Not Generated
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Click Generate to start</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Release Time Info */}
            {payrollReleaseTime && currentPeriod?.periodEnd && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Release available on <strong>{formatDateForDisplay(new Date(currentPeriod.periodEnd))}</strong> at <strong>{formatTime12Hour(payrollReleaseTime)}</strong>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">Current Payroll</TabsTrigger>
          <TabsTrigger value="archived" className="relative">
            Archived Payrolls
            {(archivedPayrolls.length > 0 && !hasViewedNewestPayroll) && (
              <span className="absolute top-0 right-0 flex h-2 w-2 z-50">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Payroll Time Settings</TabsTrigger>
        </TabsList>

        {/* Current Payroll Tab */}
        <TabsContent value="current" className="space-y-4">
          {!hasGeneratedForSettings ? (
            /* Empty State - Payroll Not Generated */
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="p-6 bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-900/30 dark:to-gray-900/30 rounded-2xl">
                      <FileText className="h-20 w-20 text-slate-600 dark:text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-foreground mb-2">Payroll Waiting to be Generated</h3>
                    <p className="text-muted-foreground max-w-md text-lg">
                      Click the button below to generate payroll for the current period
                    </p>
                  </div>
                  <Button 
                    onClick={handleGeneratePayroll} 
                    disabled={loading} 
                    size="lg" 
                    className="mt-4 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 text-white shadow-lg hover:shadow-xl transition-all px-8 py-6 text-lg"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Generate Payroll Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Payroll Generated - Show Table */
            <>
              {/* Search */}
              <div className="flex justify-between items-center">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search personnel..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredEntries.length} personnel found
                </div>
              </div>

              {/* Payroll Table */}
              <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="border-b px-6 py-4">
                  <CardTitle className="text-xl font-bold">Payroll Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b bg-muted/50">
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 px-6">ID Number</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Personnel</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Department</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Position</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Work Hours</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 text-right pr-8">Net Pay</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 pl-8">Status</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 text-center px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-16">
                              <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                <span className="text-sm text-muted-foreground">Loading payroll data...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-16">
                              <div className="flex flex-col items-center gap-3">
                                <FileText className="h-16 w-16 text-muted-foreground/30" />
                                <div>
                                  <p className="text-base font-medium text-foreground">No payroll entries found</p>
                                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                      filteredEntries.map((entry, index) => {
                        // Calculate net pay using merged deductions (same as breakdown dialog)
                        const mergedDeductions = getMergedDeductions(entry)
                        const mandatoryDeductions = mergedDeductions.filter((d: any) => isMandatoryDeduction(d))
                        const totalMandatoryDeductions = mandatoryDeductions.reduce((sum, d) => sum + d.amount, 0)
                        
                        const otherDeductionsOnly = mergedDeductions.filter((deduction: any) => {
                          const type = deduction.type.toLowerCase()
                          const isMandatory = isMandatoryDeduction(deduction)
                          const isAttendance = type.includes('late') || 
                                              type.includes('absent') || 
                                              type.includes('absence') ||
                                              type.includes('early') ||
                                              type.includes('tardiness') ||
                                              type.includes('partial')
                          return !isMandatory && !isAttendance
                        })
                        const totalOtherDeductions = otherDeductionsOnly.reduce((sum, d) => sum + d.amount, 0)
                        
                        // Add today's absence deduction if applicable
                        const todayAbsenceDeduction = getTodayAbsenceDeduction(entry)
                        
                        const totalDeductions = 
                          Number(entry.breakdown.attendanceDeductions) +
                          todayAbsenceDeduction +
                          Number(entry.breakdown.loanDeductions) +
                          totalMandatoryDeductions +
                          totalOtherDeductions
                        
                        const overloadPay = Number(entry.breakdown.overloadPay || 0)
                        const netPay = Number(entry.breakdown.basicSalary) + overloadPay - totalDeductions
                        
                        return (
                        <TableRow 
                          key={`${entry.users_id}-${index}`}
                          className="border-b border-border/50 hover:bg-transparent"
                        >
                          <TableCell className="px-6 py-4">
                            <span className="inline-flex items-center font-mono text-xs font-medium text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-md">
                              {entry.users_id}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                {entry.avatar ? (
                                  <img 
                                    src={entry.avatar} 
                                    alt={entry.name} 
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-sm">
                                    {entry.name?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-sm text-foreground">{entry.name}</span>
                                <span className="text-xs text-muted-foreground">{entry.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {entry.department || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="font-medium text-xs px-2.5 py-1">
                              {entry.personnelType || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <LiveWorkHours
                              userId={entry.users_id}
                              totalWorkHours={entry.totalWorkHours}
                              now={now}
                            />
                          </TableCell>
                          <TableCell className="py-4 text-right pr-8">
                            <span className="font-bold text-base text-green-600">
                              ₱{entry.finalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 pl-8">
                            <div className="flex flex-col gap-1.5">
                              {getStatusBadge(entry.status)}
                              {entry.status === 'Released' && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Ready
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center px-6">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="font-medium"
                              onClick={() => {
                                setSelectedEntry(entry)
                                setBreakdownDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
            </>
          )}
        </TabsContent>

        {/* Archived Payrolls Tab */}
        <TabsContent value="archived" className="space-y-6">
          {/* Search Bar */}
          <div className="flex items-center gap-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <Input
                placeholder="Search by period, date, or released by..."
                value={archiveSearchTerm}
                onChange={(e) => setArchiveSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300">
                {archivedPayrolls.filter(payroll => {
                  const searchLower = archiveSearchTerm.toLowerCase()
                  const periodStart = formatDateForDisplay(new Date(payroll.periodStart)).toLowerCase()
                  const periodEnd = formatDateForDisplay(new Date(payroll.periodEnd)).toLowerCase()
                  const releasedAt = formatDateForDisplay(new Date(payroll.releasedAt)).toLowerCase()
                  const releasedBy = payroll.releasedBy.toLowerCase()
                  return periodStart.includes(searchLower) || 
                         periodEnd.includes(searchLower) || 
                         releasedAt.includes(searchLower) ||
                         releasedBy.includes(searchLower)
                }).length} / {archivedPayrolls.length}
              </span>
              <span className="text-muted-foreground">results</span>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-b-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl shadow-lg">
                    <Archive className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Archived Payrolls
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300">
                        {archivedPayrolls.length} Records
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span>Historical payroll data</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="default"
                        disabled={archivedPayrolls.length === 0}
                        className="gap-2 px-4 py-2"
                      >
                        <FileText className="h-4 w-4" />
                        View Payroll for Personnel
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="!max-w-none w-[98vw] h-[95vh] !max-h-none overflow-hidden flex flex-col" style={{ maxWidth: '98vw', width: '98vw', height: '95vh', maxHeight: '95vh' }}>
                          <DialogHeader className="border-b pb-4">
                            <DialogTitle className="text-xl font-semibold">View Payroll for Personnel</DialogTitle>
                            <DialogDescription>
                              Select a personnel, then choose a payroll period to view their payroll details
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden p-4">
                            {/* Left: Personnel List */}
                            <div className="border-r pr-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Select Personnel</h3>
                              </div>
                              
                              {/* Search Bar */}
                              <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search personnel..."
                                  className="pl-9 h-9"
                                  value={personnelSearchTerm}
                                  onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                                />
                              </div>
                              
                              {/* Grand Total Card */}
                              {(() => {
                                const grandTotal = archivedPayrolls.reduce((total, payroll) => {
                                  const periodTotal = payroll.payrolls?.reduce((sum: number, person: any) => 
                                    sum + Number(person.netPay || 0), 0
                                  ) || 0
                                  return total + periodTotal
                                }, 0)
                                
                                return (
                                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Grand Total</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{archivedPayrolls.length} periods</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(grandTotal)}</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                              
                              <div className="space-y-2 max-h-[75vh] overflow-y-auto">
                                {(() => {
                                  // Get unique personnel from all archived payrolls
                                  const personnelMap = new Map()
                                  archivedPayrolls.forEach(payroll => {
                                    payroll.payrolls?.forEach((person: any) => {
                                      if (!personnelMap.has(person.users_id)) {
                                        personnelMap.set(person.users_id, person)
                                      }
                                    })
                                  })
                                  let uniquePersonnel = Array.from(personnelMap.values())
                                  
                                  // Filter by search term
                                  if (personnelSearchTerm) {
                                    const searchLower = personnelSearchTerm.toLowerCase()
                                    uniquePersonnel = uniquePersonnel.filter((person: any) => 
                                      person.user?.name?.toLowerCase().includes(searchLower) ||
                                      person.user?.personnelType?.department?.toLowerCase().includes(searchLower)
                                    )
                                  }
                                  
                                  return uniquePersonnel.map((person: any) => {
                                    const isSelected = selectedPersonnelForPeriods?.users_id === person.users_id
                                    
                                    // Calculate total net pay for this personnel across all periods
                                    const totalNetPay = archivedPayrolls.reduce((total, payroll) => {
                                      const personnelInPeriod = payroll.payrolls?.find((p: any) => p.users_id === person.users_id)
                                      return total + (personnelInPeriod ? Number(personnelInPeriod.netPay || 0) : 0)
                                    }, 0)
                                    
                                    return (
                                      <div
                                        key={person.users_id}
                                        onClick={() => {
                                          setSelectedPersonnelForPeriods(person)
                                          // Get all periods for this personnel
                                          const personnelPeriods = archivedPayrolls.filter(payroll => 
                                            payroll.payrolls?.some((p: any) => p.users_id === person.users_id)
                                          )
                                          setArchivedPersonnelList(personnelPeriods)
                                        }}
                                        className={`
                                          p-3 rounded-md border cursor-pointer transition-all
                                          ${isSelected 
                                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-500' 
                                            : 'bg-background border-border hover:border-blue-300'
                                          }
                                        `}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex-1">
                                            <p className="font-semibold text-sm">{person.user?.name || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">{person.user?.personnelType?.department || 'N/A'}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                              {formatCurrency(totalNetPay)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Total Net Pay</p>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })
                                })()}
                              </div>
                            </div>
                            
                            {/* Right: Period List for selected personnel */}
                            <div className="pl-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                                  {selectedPersonnelForPeriods ? 'Select Payroll Period' : 'Select Personnel First'}
                                </h3>
                              </div>
                              
                              {selectedPersonnelForPeriods && (
                                <>
                                  {/* Total Net Pay Card for Selected Personnel */}
                                  {(() => {
                                    const totalNetPay = archivedPayrolls.reduce((total, payroll) => {
                                      const personnelInPeriod = payroll.payrolls?.find((p: any) => p.users_id === selectedPersonnelForPeriods.users_id)
                                      return total + (personnelInPeriod ? Number(personnelInPeriod.netPay || 0) : 0)
                                    }, 0)
                                    
                                    const periodCount = archivedPersonnelList.length
                                    
                                    return (
                                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">
                                              {selectedPersonnelForPeriods.user?.name || 'Personnel'} - Total Net Pay
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{periodCount} period{periodCount !== 1 ? 's' : ''}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalNetPay)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  
                                  <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Search periods..."
                                      className="pl-9 h-9"
                                      value={periodSearchTerm}
                                      onChange={(e) => setPeriodSearchTerm(e.target.value)}
                                    />
                                  </div>
                                </>
                              )}
                              
                              <div className="space-y-2 max-h-[75vh] overflow-y-auto">
                                {selectedPersonnelForPeriods && archivedPersonnelList.length > 0 ? (
                                  (() => {
                                    let filteredPayrolls = archivedPersonnelList
                                    
                                    // Filter by search term
                                    if (periodSearchTerm) {
                                      const searchLower = periodSearchTerm.toLowerCase()
                                      filteredPayrolls = filteredPayrolls.filter((payroll: any) => {
                                        const periodStart = formatDateForDisplay(new Date(payroll.periodStart)).toLowerCase()
                                        const periodEnd = formatDateForDisplay(new Date(payroll.periodEnd)).toLowerCase()
                                        const releasedAt = formatDateForDisplay(new Date(payroll.releasedAt)).toLowerCase()
                                        return periodStart.includes(searchLower) || 
                                               periodEnd.includes(searchLower) || 
                                               releasedAt.includes(searchLower)
                                      })
                                    }
                                    
                                    return filteredPayrolls.map((payroll: any) => {
                                      // Find this personnel's data in this period
                                      const personnelData = payroll.payrolls?.find((p: any) => p.users_id === selectedPersonnelForPeriods.users_id)
                                      const netPay = Number(personnelData?.netPay || 0)
                                    
                                    return (
                                      <div
                                        key={payroll.id}
                                        onClick={() => {
                                          setSelectedArchivedPeriod(payroll)
                                          setSelectedArchivedEntry(personnelData)
                                          setHasViewedNewestPayroll(true)
                                          setShowArchiveNotification(false)
                                          setNewArchivedPayrollId(null)
                                          localStorage.removeItem('hasNewArchivedPayroll')
                                        }}
                                        className="p-3 bg-background border border-border rounded-md cursor-pointer hover:border-primary hover:bg-accent transition-all"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex-1">
                                            <p className="font-semibold text-sm">
                                              {formatDateForDisplay(new Date(payroll.periodStart))} - {formatDateForDisplay(new Date(payroll.periodEnd))}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              Released {formatDateForDisplay(new Date(payroll.releasedAt))}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                              {formatCurrency(netPay)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Net Pay</p>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                    })
                                  })()
                                ) : selectedPersonnelForPeriods ? (
                                  <p className="text-center text-muted-foreground py-8 text-sm">No payroll periods found for this personnel</p>
                                ) : (
                                  <p className="text-center text-muted-foreground py-8 text-sm">Select a personnel to view their payroll periods</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                  {selectedArchives.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={promptBulkDeleteArchives}
                      disabled={loading}
                      className="shadow-lg hover:shadow-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedArchives.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/50">
                      <TableHead className="w-[50px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                          className="h-8 w-8 p-0"
                        >
                          {isSelectAll ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Period</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Personnel</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right pr-8">Net Pay</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider pl-8">Released</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">View</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-center w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedPayrolls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-20">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-6 bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-900/20 dark:to-gray-900/20 rounded-2xl">
                              <Archive className="h-16 w-16 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-foreground">No Archived Payrolls Yet</p>
                              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                Released payrolls will be automatically archived and displayed here for historical reference
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      archivedPayrolls
                        .filter(payroll => {
                          if (!archiveSearchTerm) return true
                          const searchLower = archiveSearchTerm.toLowerCase()
                          const periodStart = formatDateForDisplay(new Date(payroll.periodStart)).toLowerCase()
                          const periodEnd = formatDateForDisplay(new Date(payroll.periodEnd)).toLowerCase()
                          const releasedAt = formatDateForDisplay(new Date(payroll.releasedAt)).toLowerCase()
                          const releasedBy = payroll.releasedBy.toLowerCase()
                          return periodStart.includes(searchLower) || 
                                 periodEnd.includes(searchLower) || 
                                 releasedAt.includes(searchLower) ||
                                 releasedBy.includes(searchLower)
                        })
                        .map((payroll) => (
                        <TableRow key={payroll.id} className="border-b border-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                          <TableCell className="py-5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleArchive(payroll.id)}
                              className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-900/30"
                            >
                              {selectedArchives.includes(payroll.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex items-center gap-3 relative">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-900/30 dark:to-gray-900/30 rounded-lg">
                                  <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm text-foreground">{formatDateForDisplay(new Date(payroll.periodStart))}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span>to</span>
                                    <span className="font-medium">{formatDateForDisplay(new Date(payroll.periodEnd))}</span>
                                  </span>
                                </div>
                              </div>
                              {(archivedPayrolls.indexOf(payroll) === 0 && !hasViewedNewestPayroll) && (
                                <span className="relative flex h-3 w-3 flex-shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-lg"></span>
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge variant="secondary" className="font-semibold bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-900/30 dark:to-gray-900/30 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                              {payroll.totalEmployees} Personnel
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5 text-right pr-8">
                            <span className="text-lg font-bold text-green-600 dark:text-green-500">
                              {formatCurrency(payroll.payrolls?.reduce((sum: number, person: any) => sum + Number(person.netPay || 0), 0) || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="py-5 pl-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-foreground">{formatDateForDisplay(new Date(payroll.releasedAt))}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                by {payroll.releasedBy}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-5">
                            <Button
                              variant="default"
                              size="default"
                              onClick={() => {
                                setSelectedArchivedPeriod(payroll)
                                setArchivedPersonnelList(payroll.payrolls || [])
                                setArchivedBreakdownOpen(true)
                                
                                // Clear notification if viewing the first/newest archived payroll
                                if (archivedPayrolls.indexOf(payroll) === 0) {
                                  setHasViewedNewestPayroll(true)
                                  setShowArchiveNotification(false)
                                  setNewArchivedPayrollId(null)
                                  localStorage.removeItem('hasNewArchivedPayroll')
                                }
                              }}
                              className="gap-2 px-4 py-2"
                            >
                              <FileText className="h-4 w-4" />
                              View Payroll
                            </Button>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => {
                                  // View individual personnel payrolls
                                  setSelectedArchivedPeriod(payroll)
                                  setArchivedPersonnelList(payroll.payrolls || [])
                                  setArchivedBreakdownOpen(true)
                                  
                                  // Clear notification if viewing the first/newest archived payroll
                                  if (archivedPayrolls.indexOf(payroll) === 0) {
                                    setHasViewedNewestPayroll(true)
                                    setShowArchiveNotification(false)
                                    setNewArchivedPayrollId(null)
                                    localStorage.removeItem('hasNewArchivedPayroll')
                                  }
                                }}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Personnel
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Clear notification if viewing the first/newest archived payroll
                                  if (archivedPayrolls.indexOf(payroll) === 0) {
                                    setHasViewedNewestPayroll(true)
                                    setShowArchiveNotification(false)
                                    setNewArchivedPayrollId(null)
                                    localStorage.removeItem('hasNewArchivedPayroll') // Clear sidebar notification
                                  }
                                  handlePreviewArchivedPayslips(payroll.periodStart, payroll.periodEnd)
                                }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Payslips
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Clear notification if viewing the first/newest archived payroll
                                  if (archivedPayrolls.indexOf(payroll) === 0) {
                                    setHasViewedNewestPayroll(true)
                                    setShowArchiveNotification(false)
                                    setNewArchivedPayrollId(null)
                                    localStorage.removeItem('hasNewArchivedPayroll') // Clear sidebar notification
                                  }
                                  handlePreviewArchivedPayslips(payroll.periodStart, payroll.periodEnd)
                                }}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Reprint
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    const response = await fetch('/api/admin/payroll/print-screenshot', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        periodStart: payroll.periodStart, 
                                        periodEnd: payroll.periodEnd 
                                      })
                                    })
                                    
                                    if (!response.ok) throw new Error('Failed to generate payslip')
                                    
                                    const html = await response.text()
                                    const printWindow = window.open('', '_blank')
                                    if (printWindow) {
                                      printWindow.document.write(html)
                                      printWindow.document.close()
                                    }
                                  } catch (error) {
                                    toast.error('Failed to generate payslip')
                                  }
                                }}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteArchivedPayroll(payroll.id, payroll.periodStart, payroll.periodEnd)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Time Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Payroll Time Settings */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-b-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Payroll Time Settings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set the payroll period dates. This will be used to calculate working days and generate payroll.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Duration Shortcuts */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Label className="mb-3 block text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Quick Duration
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setDate(today.getDate() + 6)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      7 Days
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setDate(today.getDate() + 13)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      14 Days
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setDate(today.getDate() + 14)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      15 Days (Semi-Monthly)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setMonth(today.getMonth() + 1)
                        end.setDate(0)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      1 Month
                    </Button>
                  </div>
                  <div className="flex items-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex-1">
                      <Label className="font-medium">Custom Days</Label>
                      <Input 
                        type="number" 
                        placeholder="Enter days" 
                        value={settingsCustomDays}
                        onChange={(e) => setSettingsCustomDays(e.target.value)}
                        min="1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const days = parseInt(settingsCustomDays)
                        if (days > 0) {
                          const today = new Date()
                          const end = new Date(today)
                          end.setDate(today.getDate() + days - 1)
                          setPayrollPeriodStart(toPhilippinesDateString(today))
                          setPayrollPeriodEnd(toPhilippinesDateString(end))
                          toast.success(`Set period to ${days} days`)
                        } else {
                          toast.error('Please enter a valid number of days')
                        }
                      }}
                      disabled={!settingsCustomDays || parseInt(settingsCustomDays) <= 0}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Label className="mb-3 block text-base font-semibold">Period Configuration</Label>
                  <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="payrollPeriodStart">Period Start Date</Label>
                    <Input
                      id="payrollPeriodStart"
                      type="date"
                      min={todayPHString}
                      value={payrollPeriodStart ? toPhilippinesDateString(new Date(payrollPeriodStart)) : ''}
                      onChange={(e) => setPayrollPeriodStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payrollPeriodEnd">Period End Date</Label>
                    <Input
                      id="payrollPeriodEnd"
                      type="date"
                      min={todayPHString}
                      value={payrollPeriodEnd ? toPhilippinesDateString(new Date(payrollPeriodEnd)) : ''}
                      onChange={(e) => setPayrollPeriodEnd(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payrollReleaseTime">Release Time (Auto: Time-out End)</Label>
                    <Input
                      id="payrollReleaseTime"
                      type="time"
                      value={payrollReleaseTime}
                      onChange={(e) => setPayrollReleaseTime(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically set to time-out end time from attendance settings
                    </p>
                  </div>
                  </div>
                  
                  {payrollPeriodStart && payrollPeriodEnd && (
                    <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <strong>Working Days:</strong> 
                        <span className="text-slate-700 dark:text-slate-300">{
                          calculateWorkingDaysInPhilippines(new Date(payrollPeriodStart), new Date(payrollPeriodEnd))
                        } days</span>
                        <span className="text-xs text-muted-foreground">(excludes Sundays)</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Testing Release Button */}
                {hasGeneratedForSettings && currentPeriod?.status !== 'Released' && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <span>🧪</span>
                      Testing Controls
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Development mode only - bypass time restrictions</p>
                    <Button 
                      onClick={handleReleasePayroll} 
                      disabled={loading}
                      variant="destructive"
                      className="bg-purple-600 hover:bg-purple-700 w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Release Payroll Now (Bypass Time Check)
                    </Button>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      ⚠️ This will immediately release payroll, bypassing the countdown timer. You can print payslips after release.
                    </p>
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

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-b-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Reschedule Payroll Period
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure the next payroll period or reschedule the current one.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
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
                      min={todayPHString}
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
                      min={todayPHString}
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
                  <div className="mt-6 p-4 bg-muted/30 dark:bg-muted/20 border border-border rounded-lg">
                    <h4 className="font-medium mb-2 text-foreground">Current Period</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Start:</span>
                        <p className="font-medium text-foreground">{formatDateForDisplay(new Date(currentPeriod.periodStart))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End:</span>
                        <p className="font-medium text-foreground">{formatDateForDisplay(new Date(currentPeriod.periodEnd))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium text-foreground">{currentPeriod.type}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payroll Breakdown Dialog - For current payroll individual employees */}
      <PayrollBreakdownDialog
        entry={selectedEntry}
        currentPeriod={currentPeriod}
        isOpen={breakdownDialogOpen}
        onClose={() => setBreakdownDialogOpen(false)}
        showArchiveButton={true}
        onArchive={async (userId: string) => {
          if (!currentPeriod || !selectedEntry) return
          
          // Check if this is manual archive (Pending) or regular archive (Released)
          if (selectedEntry.status === 'Pending') {
            // Manual archive breakdown - save snapshot
            const confirmed = confirm('Archive this breakdown? This will save the current breakdown data for personnel to view.')
            if (!confirmed) return
            
            try {
              const response = await fetch('/api/admin/payroll/save-breakdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  periodStart: currentPeriod.periodStart,
                  periodEnd: currentPeriod.periodEnd,
                  breakdownData: selectedEntry.breakdown
                })
              })
              
              const data = await response.json()
              
              if (response.ok) {
                alert('Breakdown archived successfully! Personnel can now view this breakdown.')
                setBreakdownDialogOpen(false)
                await loadPayrollData()
                setActiveTab('saved') // Switch to Saved Payroll Breakdown tab
              } else {
                alert(`Failed to archive breakdown: ${data.error}`)
              }
            } catch (error) {
              console.error('Error archiving breakdown:', error)
              alert('Failed to archive breakdown')
            }
          } else {
            // Regular archive for Released status
            const confirmed = confirm('Are you sure you want to archive this payroll entry? This action cannot be undone.')
            if (!confirmed) return
            
            try {
              const response = await fetch('/api/admin/payroll/archive-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  periodStart: currentPeriod.periodStart,
                  periodEnd: currentPeriod.periodEnd
                })
              })
              
              const data = await response.json()
              
              if (response.ok) {
                alert('Payroll entry archived successfully!')
                setBreakdownDialogOpen(false)
                loadPayrollData()
              } else {
                alert(`Failed to archive: ${data.error}`)
              }
            } catch (error) {
              console.error('Error archiving payroll entry:', error)
              alert('Failed to archive payroll entry')
            }
          }
        }}
      />

      {/* Post-Release Prompt Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Payroll Released Successfully!</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                Payslips are ready for {payrollEntries.filter(e => e.status === 'Released').length} employee(s).
              </DialogDescription>
              {currentPeriod?.periodStart && currentPeriod?.periodEnd && (
                <div className="text-xs text-muted-foreground mt-2">
                  Period: {formatDateForDisplay(new Date(currentPeriod.periodStart))} — {formatDateForDisplay(new Date(currentPeriod.periodEnd))}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Would you like to preview and print the payslips now?
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                setShowPrintModal(false)
                console.log('🔴 SETTING showArchiveNotification to TRUE from Later button')
                setShowArchiveNotification(true)
                
                // Fetch the newly archived payroll ID
                try {
                  const res = await fetch('/api/admin/payroll/archived')
                  if (res.ok) {
                    const data = await res.json()
                    if (data.success && data.archivedPayrolls && data.archivedPayrolls.length > 0) {
                      setNewArchivedPayrollId(data.archivedPayrolls[0].id)
                    }
                  }
                } catch (error) {
                  console.error('Error fetching archived payroll ID:', error)
                }
                
                // Add a subtle reminder toast
                toast('New archived payroll ready to be printed', { icon: '📝' })
              }}
              className="flex-1"
            >
              Later
            </Button>
            <Button
              onClick={() => {
                setShowPrintModal(false)
                handleGeneratePayslips({ bypassReleaseCheck: true })
              }}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Preview & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent 
          className="p-0 flex flex-col bg-gradient-to-br from-background to-muted/20"
          style={{
            maxWidth: '1800px',
            width: '95vw',
            height: '98vh'
          }}
        >
          <DialogHeader className="px-6 py-5 border-b bg-card/50 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  Payslip Preview
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Review and verify payslips before printing. Use the controls below to navigate and zoom.
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {currentPeriod?.periodStart && currentPeriod?.periodEnd 
                  ? `${new Date(currentPeriod.periodStart).toLocaleDateString()} - ${new Date(currentPeriod.periodEnd).toLocaleDateString()}`
                  : 'Current Period'
                }
              </Badge>
            </div>
            
            {/* Enhanced Controls */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              {/* View Mode */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-muted-foreground">View:</label>
                <select
                  className="border-0 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer"
                  value={previewMode}
                  onChange={(e) => setPreviewMode(e.target.value as 'all' | 'single')}
                >
                  <option value="all">All Personnel</option>
                  <option value="single">Single Personnel</option>
                </select>
              </div>
              
              {/* Search */}
              {previewMode === 'single' && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 flex-1 max-w-md">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground/60"
                    placeholder="Search by name or email..."
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value)
                      setTimeout(() => {
                        try {
                          const doc = iframeRef.current?.contentDocument
                          if (!doc) return
                          const text = e.target.value.trim().toLowerCase()
                          doc.querySelectorAll('[data-search-highlight]')?.forEach(el => {
                            el.removeAttribute('data-search-highlight')
                            ;(el as HTMLElement).style.backgroundColor = ''
                          })
                          if (!text) return
                          const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
                          let node: Node | null
                          const matches: HTMLElement[] = []
                          while ((node = walker.nextNode())) {
                            const value = (node.textContent || '').toLowerCase()
                            if (value.includes(text)) {
                              const parent = (node.parentElement as HTMLElement)
                              if (parent) {
                                parent.setAttribute('data-search-highlight', '1')
                                parent.style.backgroundColor = 'rgba(250, 204, 21, 0.35)'
                                matches.push(parent)
                              }
                            }
                          }
                          if (matches.length > 0) {
                            matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }
                        } catch {}
                      }, 50)
                    }}
                  />
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 ml-auto">
                <label className="text-sm font-medium text-muted-foreground">Zoom:</label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => setPreviewScale(s => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
                >
                  -
                </Button>
                <span className="text-sm font-semibold w-14 text-center bg-background rounded px-2 py-1">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={() => setPreviewScale(s => Math.min(2.5, Number((s + 0.1).toFixed(2))))}
                >
                  +
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => {
                    setPreviewScale(1)
                    resetPan()
                  }}
                >
                  Reset View
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Preview Area with Drag & Scroll */}
          <div 
            ref={previewContainerRef}
            className="flex-1 overflow-auto bg-muted/30 relative"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            <div 
              className="flex items-center justify-center p-6"
              style={{
                minWidth: 'fit-content',
                minHeight: '100%'
              }}
            >
              <div 
                style={{ 
                  transform: `scale(${previewScale}) translate(${panPosition.x / previewScale}px, ${panPosition.y / previewScale}px)`, 
                  transformOrigin: 'center center', 
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                  width: '1200px',
                  position: 'relative'
                }}
              >
                <iframe
                  title="Payslip Preview"
                  ref={iframeRef}
                  srcDoc={previewHtml}
                  className="w-full border-2 border-border rounded-xl shadow-2xl bg-white"
                  style={{ 
                    width: '1200px',
                    height: '1600px',
                    display: 'block',
                    pointerEvents: 'none'
                  }}
                />
                {/* Transparent overlay to capture drag events */}
                <div 
                  className="absolute inset-0 rounded-xl"
                  style={{ 
                    pointerEvents: 'auto',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                />
              </div>
            </div>
            
            {/* Pan Indicator */}
            {(panPosition.x !== 0 || panPosition.y !== 0) && (
              <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2 z-10">
                <Eye className="h-3 w-3" />
                Pan: {Math.round(panPosition.x)}px, {Math.round(panPosition.y)}px
              </div>
            )}
            
            {/* Drag Instruction */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 shadow-lg z-10">
              <Eye className="h-4 w-4" />
              <span className="font-medium">Click & drag to move • Scroll to navigate • Ctrl+Scroll to zoom</span>
            </div>
          </div>
          
          {/* Enhanced Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-card/50 backdrop-blur-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Ensure all details are correct before printing</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowPreviewModal(false)}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  try {
                    const blob = new Blob([previewHtml], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `payslips-${currentPeriod?.periodStart || 'current'}.html`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success('Payslips downloaded successfully!')
                  } catch (error) {
                    toast.error('Failed to download payslips')
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download HTML
              </Button>
              <Button 
                onClick={() => {
                  const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
                  if (printWindow) {
                    printWindow.document.write(previewHtml)
                    printWindow.document.close()
                    setShowPreviewModal(false)
                    toast.success('Opening print dialog...')
                  } else {
                    toast.error('Popup blocked. Please allow popups for this site and try again.')
                  }
                }}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Payslips
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Archived Payroll Confirmation Modal */}
      <Dialog open={showDeleteArchiveModal} onOpenChange={setShowDeleteArchiveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Archived Payrolls?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedArchives.length} archived payroll(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteArchiveModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteArchives}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archived Payroll Breakdown Dialog - Personnel List */}
      <Dialog open={archivedBreakdownOpen && !selectedArchivedEntry} onOpenChange={(open) => {
        if (!open) {
          setArchivedBreakdownOpen(false)
          setSelectedArchivedPeriod(null)
          setArchivedPersonnelList([])
        }
      }}>
        <DialogContent className="overflow-y-auto" style={{ maxWidth: '80vw', width: '80vw', maxHeight: '85vh' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Archived Payroll Breakdown</DialogTitle>
            <DialogDescription className="text-base">
              {selectedArchivedPeriod && (
                <>Period: {formatDateForDisplay(new Date(selectedArchivedPeriod.periodStart))} - {formatDateForDisplay(new Date(selectedArchivedPeriod.periodEnd))}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, personnel type, or department..."
                className="pl-9"
                value={archivedBreakdownSearchTerm}
                onChange={(e) => setArchivedBreakdownSearchTerm(e.target.value)}
              />
            </div>
            
            {archivedPersonnelList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No personnel found for this period</p>
            ) : (
              (() => {
                // Filter personnel by search term
                const filteredPersonnel = archivedPersonnelList.filter((person) => {
                  if (!archivedBreakdownSearchTerm) return true
                  const searchLower = archivedBreakdownSearchTerm.toLowerCase()
                  const name = person.user?.name?.toLowerCase() || ''
                  const personnelType = person.user?.personnelType?.name?.toLowerCase() || ''
                  const department = person.user?.personnelType?.department?.toLowerCase() || ''
                  return name.includes(searchLower) || personnelType.includes(searchLower) || department.includes(searchLower)
                })
                
                return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPersonnel.map((person) => (
                    <TableRow key={person.payroll_entries_id}>
                      <TableCell className="font-medium">{person.user?.name || 'N/A'}</TableCell>
                      <TableCell>{person.user?.personnelType?.department || 'N/A'}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(Number(person.netPay || 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedArchivedEntry(person)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                )
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Archived Individual Payslip Dialog - Matches Personnel/Payroll Layout */}
      <ArchivedPayrollDetailsDialog
        entry={selectedArchivedEntry}
        period={selectedArchivedPeriod}
        isOpen={!!selectedArchivedEntry}
        onClose={() => setSelectedArchivedEntry(null)}
      />

    </div>
  )
}
