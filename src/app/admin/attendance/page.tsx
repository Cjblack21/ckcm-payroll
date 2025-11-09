"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Clock, User, Search, Calendar, AlertCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { getCurrentDayAttendance, getPersonnelAttendance, getPersonnelHistory, type AttendanceRecord, type PersonnelAttendance } from "@/lib/actions/attendance"
import toast from "react-hot-toast"

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "PARTIAL" | "NON_WORKING" | "PENDING"

type ViewMode = "current-day" | "all-attendance"

export default function AttendancePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("current-day")
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [personnelData, setPersonnelData] = useState<PersonnelAttendance[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelAttendance | null>(null)
  const [personnelAttendanceHistory, setPersonnelAttendanceHistory] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attendanceSettings, setAttendanceSettings] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false)
  const [userToDeleteAll, setUserToDeleteAll] = useState<string | null>(null)
  const [userNameToDelete, setUserNameToDelete] = useState<string | null>(null)

  const itemsPerPage = 50

  // Update current time every second for live status
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Load data based on view mode
  useEffect(() => {
    loadData()
    loadAttendanceSettings()
  }, [viewMode, dateFilter, currentPage])

  // Periodic check to auto-mark absent users after cut-off time (every 1 minute)
  useEffect(() => {
    const autoCheckAbsent = async () => {
      try {
        const response = await fetch('/api/admin/attendance/auto-check-absent', {
          method: 'POST'
        })
        if (response.ok) {
          const result = await response.json()
          console.log(`🔄 Auto-check: ${result.message}`)
          if (result.markedCount > 0) {
            console.log(`✅ Auto-marked ${result.markedCount} users as absent`)
            toast.success(`Auto-marked ${result.markedCount} users as absent`)
            // Refresh data if users were marked
            await loadData()
          }
        }
      } catch (error) {
        console.error('Error in auto-check absent:', error)
      }
    }

    // Run immediately on mount
    autoCheckAbsent()

    // Then run every 1 minute for better responsiveness
    const interval = setInterval(autoCheckAbsent, 60 * 1000)

    return () => clearInterval(interval)
  }, [viewMode])

  // Auto-refresh data every 5 seconds to pick up new attendance records
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing attendance data...')
      loadData()
    }, 5 * 1000) // Refresh every 5 seconds

    return () => clearInterval(refreshInterval)
  }, [viewMode])

  async function loadAttendanceSettings() {
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

  async function handleAutoProcess() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/attendance/auto-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Auto-processing completed! Marked ${result.results.absentMarked} as absent, ${result.results.lateMarked} as late across ${result.results.processed} days.`)
        await loadData() // Refresh the data
      } else {
        const error = await response.json()
        toast.error(`Auto-processing failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error in auto-process:', error)
      toast.error('Auto-processing failed: Network error')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      if (viewMode === "current-day") {
        console.log('Loading current-day attendance data...')
        const result = await getCurrentDayAttendance()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load current day data')
        }
        
        console.log('Response data:', result)
        console.log('Current day attendance with deductions:', result.attendance?.map(a => ({
          name: a.user.name,
          status: a.status,
          deductions: a.deductions,
          earnings: a.earnings
        })))
        setAttendanceData(result.attendance || [])
      } else if (viewMode === "all-attendance") {
        console.log('Loading personnel data...')
        const result = await getPersonnelAttendance()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load personnel data')
        }
        
        console.log('Response data:', result)
        console.log('Personnel data with deductions:', result.personnel?.map(p => ({
          name: p.name,
          totalDeductions: p.totalDeductions,
          deductions: p.totalDeductions
        })))
        setPersonnelData(result.personnel || [])
      } else if (viewMode === "old-all-attendance") {
        // For now, keep using API route for all-attendance (pagination)
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          ...(dateFilter && { date: dateFilter.toISOString().split('T')[0] })
        })
        console.log('Loading all attendance data...')
        const response = await fetch(`/api/admin/attendance/all?${params}`)
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`Failed to load all attendance data: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Response data:', data)
        setAttendanceData(data.attendance || [])
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadPersonnelHistory(userId: string) {
    try {
      const result = await getPersonnelHistory(userId)
      
      if (!result.success) {
        console.error('Error loading personnel history:', result.error)
        return
      }
      
      setPersonnelAttendanceHistory(result.attendance || [])
    } catch (error) {
      console.error('Error loading personnel history:', error)
    }
  }

  async function handleDeleteRecord(attendanceId: string) {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/attendance/${attendanceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Attendance record deleted successfully')
        await loadData()
        setDeleteConfirmOpen(false)
        setRecordToDelete(null)
      } else {
        const error = await response.json()
        toast.error(`Failed to delete: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting attendance:', error)
      toast.error('Failed to delete attendance record')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteAllRecords(userId: string) {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/attendance/user/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Deleted ${result.count} attendance records`)
        await loadData()
        setDeleteAllConfirmOpen(false)
        setUserToDeleteAll(null)
        setUserNameToDelete(null)
      } else {
        const error = await response.json()
        toast.error(`Failed to delete: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting all attendance:', error)
      toast.error('Failed to delete attendance records')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (viewMode === "all-attendance") {
      return personnelData.filter(person => 
        (person.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         person.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    } else {
      return attendanceData.filter(record => 
        (record.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         record.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
         record.user.users_id.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
  }, [attendanceData, personnelData, searchTerm, viewMode])

  // Calculate live status based on current time and cut-off
  const getLiveStatus = (dbStatus: AttendanceStatus, timeIn: Date | string | null, timeOut: Date | string | null): AttendanceStatus => {
    // If already marked as PRESENT, LATE, ABSENT in DB, keep it
    if (dbStatus === 'PRESENT' || dbStatus === 'LATE' || dbStatus === 'ABSENT' || dbStatus === 'NON_WORKING' || dbStatus === 'PARTIAL') {
      return dbStatus
    }

    // For PENDING status, check if we're past cut-off time
    if (dbStatus === 'PENDING' && attendanceSettings?.timeOutEnd) {
      const [cutoffHours, cutoffMinutes] = attendanceSettings.timeOutEnd.split(':').map(Number)
      const cutoffTime = new Date(currentTime)
      cutoffTime.setHours(cutoffHours, cutoffMinutes, 0, 0)

      // If current time is past cut-off and no time in/out, show as ABSENT (live)
      if (currentTime >= cutoffTime && !timeIn && !timeOut) {
        return 'ABSENT'
      }
    }

    return dbStatus
  }

  const getStatusBadge = (status: AttendanceStatus, isLive: boolean = false) => {
    const variants = {
      PRESENT: "default",
      ABSENT: "destructive",
      LATE: "secondary",
      PARTIAL: "secondary",
      NON_WORKING: "outline",
      PENDING: "secondary",
    } as const

    const labels = {
      PRESENT: "Present",
      ABSENT: "Absent",
      LATE: "Late",
      PARTIAL: "Partial",
      NON_WORKING: "Non-Working",
      PENDING: "Pending",
    }

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {labels[status]}
        {isLive && status === 'ABSENT' && (
          <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Live status based on cut-off time" />
        )}
      </Badge>
    )
  }

  const formatTime = (time: Date | string | null) => {
    if (!time) return "—"
    // Convert to Philippine time and format in 12-hour format
    const date = time instanceof Date ? time : new Date(time)
    return formatInTimeZone(date, "Asia/Manila", "h:mm a")
  }

  const formatWorkHours = (hours: number) => {
    const totalSeconds = Math.floor(hours * 3600)
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Calculate live work hours for users who have timed in but not timed out
  const calculateLiveWorkHours = (timeIn: Date | string | null, timeOut: Date | string | null): number => {
    if (!timeIn) return 0
    
    const startTime = new Date(timeIn)
    const endTime = timeOut ? new Date(timeOut) : currentTime
    
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    return Math.max(0, hours)
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }

  // Convert 24-hour time string to 12-hour format with AM/PM
  const format24To12Hour = (time24: string | null | undefined): string => {
    if (!time24) return 'N/A'
    
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return email.split('@')[0].substring(0, 2).toUpperCase()
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Attendance Management
          </h2>
          <p className="text-muted-foreground">Monitor and manage personnel attendance with automated processing</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('/admin/attendance-settings', '_blank')}
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Period Settings
          </Button>
          <Button
            variant="default"
            onClick={handleAutoProcess}
            disabled={isLoading}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            Auto-Process
          </Button>
        </div>
      </div>

      {/* Period Status */}
      {attendanceSettings?.periodStart && attendanceSettings?.periodEnd && (
        <Card className="bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-orange-950/30 dark:via-orange-900/30 dark:to-orange-950/30 border-orange-200 dark:border-orange-800 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Period Info */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-background dark:bg-card rounded-lg shadow-sm">
                  <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Current Period</p>
                  <h3 className="text-lg font-bold text-foreground">
                    {formatInTimeZone(new Date(attendanceSettings.periodStart), 'Asia/Manila', 'MMM dd')}
                    {" - "}
                    {formatInTimeZone(new Date(attendanceSettings.periodEnd), 'Asia/Manila', 'MMM dd, yyyy')}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(() => {
                      const start = new Date(attendanceSettings.periodStart)
                      const end = new Date(attendanceSettings.periodEnd)
                      let days = 0
                      const current = new Date(start)
                      while (current <= end) {
                        if (current.getDay() !== 0) days++
                        current.setDate(current.getDate() + 1)
                      }
                      return days
                    })()} working days
                  </p>
                </div>
              </div>

              {/* Auto-Mark Absent */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg shadow-sm ${
                  attendanceSettings.autoMarkAbsent ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-muted'
                }`}>
                  <User className={`w-6 h-6 ${
                    attendanceSettings.autoMarkAbsent ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Auto-Mark Absent</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      attendanceSettings.autoMarkAbsent ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                    }`}>
                      {attendanceSettings.autoMarkAbsent ? 'Enabled' : 'Disabled'}
                    </span>
                    {attendanceSettings.autoMarkAbsent && (
                      <Badge variant="default" className="bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/30">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {attendanceSettings.autoMarkAbsent ? 'Automatically marks no-show as absent' : 'Manual marking required'}
                  </p>
                </div>
              </div>

              {/* Auto-Mark Late */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg shadow-sm ${
                  attendanceSettings.autoMarkLate ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-muted'
                }`}>
                  <Clock className={`w-6 h-6 ${
                    attendanceSettings.autoMarkLate ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Auto-Mark Late</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      attendanceSettings.autoMarkLate ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                    }`}>
                      {attendanceSettings.autoMarkLate ? 'Enabled' : 'Disabled'}
                    </span>
                    {attendanceSettings.autoMarkLate && (
                      <Badge variant="default" className="bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/30">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {attendanceSettings.autoMarkLate ? 'Automatically flags late arrivals' : 'Manual marking required'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance Overview</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "current-day" ? "default" : "outline"}
                onClick={() => {
                  setViewMode("current-day")
                  loadData() // Force refresh
                }}
                size="sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Current Day
              </Button>
              <Button
                variant={viewMode === "all-attendance" ? "default" : "outline"}
                onClick={() => setViewMode("all-attendance")}
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                Personnel Summary
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <Clock className="h-4 w-4 inline mr-2 animate-spin" />
              Loading attendance data...
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search personnel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
          </div>

          {/* Current Day View - Redesigned */}
          {viewMode === "current-day" && (
            <div className="space-y-3">
              {filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-lg">No attendance records found for today.</p>
                </div>
              ) : (
                (filteredData as AttendanceRecord[]).map((record) => {
                  const liveStatus = getLiveStatus(record.status as AttendanceStatus, record.timeIn, record.timeOut)
                  const isLive = liveStatus !== record.status
                  const liveHours = calculateLiveWorkHours(record.timeIn, record.timeOut)
                  const isCountingLive = record.timeIn && !record.timeOut
                  
                  return (
                    <Card key={record.attendances_id} className="border-l-3 transition-all hover:shadow-sm" style={{
                      borderLeftColor: 
                        liveStatus === 'PRESENT' ? '#10b981' :
                        liveStatus === 'LATE' ? '#f59e0b' :
                        liveStatus === 'ABSENT' ? '#ef4444' :
                        liveStatus === 'PARTIAL' ? '#f97316' :
                        '#6b7280'
                    }}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Profile Section */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-11 w-11 border-2" style={{
                              borderColor: 
                                liveStatus === 'PRESENT' ? '#10b981' :
                                liveStatus === 'LATE' ? '#f59e0b' :
                                liveStatus === 'ABSENT' ? '#ef4444' :
                                liveStatus === 'PARTIAL' ? '#f97316' :
                                '#6b7280'
                            }}>
                              <AvatarImage src="" />
                              <AvatarFallback className="text-sm font-semibold">
                                {getInitials(record.user.name, record.user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base truncate">
                                  {record.user.name || record.user.email}
                                </h3>
                                {getStatusBadge(liveStatus, isLive)}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px]">{record.user.users_id}</span>
                                <span className="truncate max-w-[160px]">{record.user.email}</span>
                              </div>
                            </div>
                          </div>

                          {/* Department & Position */}
                          <div className="hidden lg:flex flex-col gap-1 min-w-[170px]">
                            <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Department</div>
                            <div className="text-sm font-medium truncate">
                              {record.user.personnelType?.department || '-'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="w-fit text-[11px] px-2 py-0.5">
                                {record.user.personnelType?.name || 'N/A'}
                              </Badge>
                              {record.user.personnelType?.type && (
                                <Badge 
                                  variant={record.user.personnelType.type === 'TEACHING' ? 'default' : 'secondary'}
                                  className={`w-fit text-[10px] px-1.5 py-0.5 ${
                                    record.user.personnelType.type === 'TEACHING' 
                                      ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                      : 'bg-gray-50 text-gray-700 border-gray-300'
                                  }`}
                                >
                                  {record.user.personnelType.type === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Time In */}
                          <div className="flex flex-col gap-1 min-w-[110px]">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 uppercase tracking-wide font-medium">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                              Time In
                            </div>
                            <div className="font-semibold text-[15px] flex items-center gap-1">
                              {formatTime(record.timeIn)}
                              {record.status === 'LATE' && record.timeIn && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-700 border-orange-300">Late</Badge>
                              )}
                            </div>
                          </div>

                          {/* Time Out */}
                          <div className="flex flex-col gap-1 min-w-[110px]">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 uppercase tracking-wide font-medium">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Time Out
                            </div>
                            <div className="font-semibold text-[15px] flex items-center gap-1">
                              {formatTime(record.timeOut)}
                              {(() => {
                                if (record.timeOut && attendanceSettings?.timeOutStart) {
                                  const timeOutDate = new Date(record.timeOut)
                                  const [expectedHours, expectedMinutes] = attendanceSettings.timeOutStart.split(':').map(Number)
                                  const expectedTime = new Date(timeOutDate)
                                  expectedTime.setHours(expectedHours, expectedMinutes, 0, 0)
                                  
                                  if (timeOutDate < expectedTime) {
                                    return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-300">Early</Badge>
                                  }
                                }
                                return null
                              })()}
                            </div>
                          </div>

                          {/* Work Hours */}
                          <div className="flex flex-col gap-1 min-w-[90px]">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 uppercase tracking-wide font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              Hours
                            </div>
                            <div className="font-bold text-[15px] flex items-center gap-2" style={{
                              color: isCountingLive ? '#10b981' : 'inherit'
                            }}>
                              {formatWorkHours(liveHours)}
                              {isCountingLive && (
                                <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live counting" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* All Attendance View - Personnel Summary Redesigned */}
          {viewMode === "all-attendance" && (
            <div className="space-y-3">
              {filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-lg">
                    {personnelData.length === 0 ? 'No personnel data available. Please check if personnel types are assigned.' : 'No personnel found matching your search.'}
                  </p>
                </div>
              ) : (
                (filteredData as PersonnelAttendance[]).map((person) => (
                  <Card key={person.users_id} className="border-l-4 border-l-blue-500 transition-all hover:shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Profile Section */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-11 w-11 border-2 border-blue-500">
                            <AvatarImage src="" />
                            <AvatarFallback className="text-sm font-semibold">
                              {getInitials(person.name, person.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate mb-1">
                              {person.name || person.email}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono bg-muted px-2 py-0.5 rounded text-[11px]">{person.users_id}</span>
                              <span className="truncate max-w-[160px]">{person.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Department & Position */}
                        <div className="hidden lg:flex flex-col gap-1 min-w-[170px]">
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Department</div>
                          <div className="text-sm font-medium truncate">
                            {person.personnelType?.department || '-'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="w-fit text-[11px] px-2 py-0.5">
                              {person.personnelType?.name || 'N/A'}
                            </Badge>
                            {person.personnelType?.type && (
                              <Badge 
                                variant={person.personnelType.type === 'TEACHING' ? 'default' : 'secondary'}
                                className={`w-fit text-[10px] px-1.5 py-0.5 ${
                                  person.personnelType.type === 'TEACHING' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                    : 'bg-gray-50 text-gray-700 border-gray-300'
                                }`}
                              >
                                {person.personnelType.type === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Attendance Stats */}
                        <div className="flex items-center gap-3">
                          {/* Present Days */}
                          <div className="flex flex-col items-center gap-1 min-w-[65px]">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Present</div>
                            <div className="text-xl font-bold text-green-600">{person.presentDays}</div>
                          </div>

                          {/* Absent Days */}
                          <div className="flex flex-col items-center gap-1 min-w-[65px]">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Absent</div>
                            <div className="text-xl font-bold text-red-600">{person.absentDays}</div>
                          </div>

                          {/* Late Days */}
                          <div className="flex flex-col items-center gap-1 min-w-[65px]">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Late</div>
                            <div className="text-xl font-bold text-orange-600">{person.lateDays || 0}</div>
                          </div>

                          {/* Early Timeouts */}
                          <div className="flex flex-col items-center gap-1 min-w-[65px]">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Early Out</div>
                            <div className="text-xl font-bold text-yellow-600">{person.earlyTimeouts || 0}</div>
                          </div>

                          {/* Partial Days */}
                          <div className="flex flex-col items-center gap-1 min-w-[65px]">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Partial</div>
                            <div className="text-xl font-bold text-purple-600">{person.partialDays || 0}</div>
                          </div>

                          {/* Total Hours */}
                          <div className="flex flex-col items-center gap-1 min-w-[85px]">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Total Hrs</div>
                            <div className="text-[15px] font-bold">{formatWorkHours(person.totalHours)}</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedPersonnel(person)
                                  loadPersonnelHistory(person.users_id)
                                }}
                                className="h-9 text-xs"
                              >
                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                View History
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="!max-w-[90vw] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-xl">Attendance History - {person.name || person.email}</DialogTitle>
                                <DialogDescription>
                                  Complete attendance record for this personnel
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                              {/* Personnel Info Summary */}
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Name</div>
                                    <div className="font-semibold text-sm text-gray-900">{person.name || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Email</div>
                                    <div className="font-semibold text-sm text-gray-900 truncate">{person.email}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Department</div>
                                    <div className="font-semibold text-sm text-gray-900">{person.personnelType?.department || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Position</div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm text-gray-900">{person.personnelType?.name || 'N/A'}</span>
                                      {person.personnelType?.type && (
                                        <Badge 
                                          variant={person.personnelType.type === 'TEACHING' ? 'default' : 'secondary'}
                                          className={`text-[10px] px-1.5 py-0 ${
                                            person.personnelType.type === 'TEACHING' 
                                              ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                              : 'bg-gray-100 text-gray-700 border-gray-300'
                                          }`}
                                        >
                                          {person.personnelType.type === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Attendance Settings Summary */}
                              {attendanceSettings && (
                                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                  <h3 className="font-semibold text-sm">Attendance Settings</h3>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Time In Window:</span>
                                      <span className="ml-2 font-medium">{format24To12Hour(attendanceSettings.timeInStart)} - {format24To12Hour(attendanceSettings.timeInEnd)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Time Out Window:</span>
                                      <span className="ml-2 font-medium">{format24To12Hour(attendanceSettings.timeOutStart)} - {format24To12Hour(attendanceSettings.timeOutEnd)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Late Deductions Start:</span>
                                      <span className="ml-2 font-medium">After {format24To12Hour(attendanceSettings.timeInEnd)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Absent Cutoff:</span>
                                      <span className="ml-2 font-medium">After {format24To12Hour(attendanceSettings.timeOutEnd)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Summary Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                  <div className="text-xs text-green-700 font-medium uppercase tracking-wide mb-1">Present Days</div>
                                  <div className="text-2xl font-bold text-green-700">{person.presentDays}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                  <div className="text-xs text-red-700 font-medium uppercase tracking-wide mb-1">Absent Days</div>
                                  <div className="text-2xl font-bold text-red-700">{person.absentDays}</div>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                  <div className="text-xs text-orange-700 font-medium uppercase tracking-wide mb-1">Late Arrivals</div>
                                  <div className="text-2xl font-bold text-orange-700">{person.lateDays || 0}</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                  <div className="text-xs text-yellow-700 font-medium uppercase tracking-wide mb-1">Early Outs</div>
                                  <div className="text-2xl font-bold text-yellow-700">{person.earlyTimeouts || 0}</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                  <div className="text-xs text-purple-700 font-medium uppercase tracking-wide mb-1">Partial Days</div>
                                  <div className="text-2xl font-bold text-purple-700">{person.partialDays || 0}</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <div className="text-xs text-blue-700 font-medium uppercase tracking-wide mb-1">Total Hours</div>
                                  <div className="text-2xl font-bold text-blue-700">{formatWorkHours(person.totalHours)}</div>
                                </div>
                              </div>
                              
                              <div className="space-y-4 w-full overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader>
                                      <TableRow>
                        <TableHead className="w-[180px]">Date</TableHead>
                        <TableHead className="w-[120px]">Day</TableHead>
                        <TableHead className="w-[160px]">Time In</TableHead>
                        <TableHead className="w-[160px]">Time Out</TableHead>
                        <TableHead className="w-[280px]">Attendance Details</TableHead>
                        <TableHead className="w-[120px] text-right">Work Hours</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {personnelAttendanceHistory.length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            No attendance records found for this personnel.
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        personnelAttendanceHistory.map((record) => {
                                          const recordDate = new Date(record.date)
                                          const dayName = recordDate.toLocaleDateString('en-US', { weekday: 'long' })
                                          
                                          // Check for late arrival
                                          let isLate = false
                                          if (record.timeIn && attendanceSettings?.timeInEnd) {
                                            const timeIn = new Date(record.timeIn)
                                            const expectedTimeIn = new Date(recordDate)
                                            const [hours, minutes] = attendanceSettings.timeInEnd.split(':').map(Number)
                                            const expectedMinutes = minutes + 1
                                            if (expectedMinutes >= 60) {
                                              expectedTimeIn.setHours(hours + 1, expectedMinutes - 60, 0, 0)
                                            } else {
                                              expectedTimeIn.setHours(hours, expectedMinutes, 0, 0)
                                            }
                                            isLate = timeIn > expectedTimeIn
                                          }
                                          
                                          // Check for early timeout
                                          let isEarlyOut = false
                                          if (record.timeOut && attendanceSettings?.timeOutStart) {
                                            const timeOut = new Date(record.timeOut)
                                            const [hours, minutes] = attendanceSettings.timeOutStart.split(':').map(Number)
                                            const expectedTimeOut = new Date(recordDate)
                                            expectedTimeOut.setHours(hours, minutes, 0, 0)
                                            isEarlyOut = timeOut < expectedTimeOut
                                          }
                                          
                                          // Check for partial (missing timeout past cutoff)
                                          const isPartial = record.status === 'PARTIAL'
                                          const isAbsent = record.status === 'ABSENT'
                                          const isPending = record.status === 'PENDING'
                                          
                                          // Calculate live work hours
                                          const isCurrentlyWorking = record.timeIn && !record.timeOut
                                          const liveWorkHours = isCurrentlyWorking 
                                            ? (currentTime.getTime() - new Date(record.timeIn!).getTime()) / (1000 * 60 * 60)
                                            : record.workHours
                                          
                                          return (
                                            <TableRow key={record.attendances_id} className="hover:bg-muted/30">
                                              <TableCell className="font-medium text-base">{format(recordDate, "MMM dd, yyyy")}</TableCell>
                                              <TableCell className="text-muted-foreground">{dayName}</TableCell>
                                              <TableCell>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono text-sm">{formatTime(record.timeIn)}</span>
                                                  {isLate && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-700 border-orange-300">
                                                      Late
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono text-sm">{formatTime(record.timeOut)}</span>
                                                  {isEarlyOut && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-300">
                                                      Early
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  {isAbsent && (
                                                    <Badge variant="destructive" className="text-xs">
                                                      Absent
                                                    </Badge>
                                                  )}
                                                  {isPending && (
                                                    <Badge variant="outline" className="text-xs bg-gray-50">
                                                      Pending
                                                    </Badge>
                                                  )}
                                                  {isPartial && (
                                                    <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                                      Partial
                                                    </Badge>
                                                  )}
                                                  {!isAbsent && !isPending && !isPartial && (
                                                    <>
                                                      {isLate && (
                                                        <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                                          Late Arrival
                                                        </Badge>
                                                      )}
                                                      {isEarlyOut && (
                                                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                                          Early Departure
                                                        </Badge>
                                                      )}
                                                      {!isLate && !isEarlyOut && (
                                                        <Badge variant="default" className="text-xs bg-green-50 text-green-700 border-green-300">
                                                          On Time
                                                        </Badge>
                                                      )}
                                                    </>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                  <span className="font-semibold text-base" style={{
                                                    color: isCurrentlyWorking ? '#10b981' : 'inherit'
                                                  }}>
                                                    {formatWorkHours(liveWorkHours)}
                                                  </span>
                                                  {isCurrentlyWorking && (
                                                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live counting" />
                                                  )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          )
                                        })
                                      )}
                                    </TableBody>
                                </Table>
                              </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToDeleteAll(person.users_id)
                              setUserNameToDelete(person.name || person.email)
                              setDeleteAllConfirmOpen(true)
                            }}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete all attendance records"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Delete Single Record Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Attendance Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setRecordToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => recordToDelete && handleDeleteRecord(recordToDelete)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Records Confirmation Dialog */}
      <Dialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Attendance Records</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete ALL attendance records for <strong>{userNameToDelete}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteAllConfirmOpen(false)
                setUserToDeleteAll(null)
                setUserNameToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDeleteAll && handleDeleteAllRecords(userToDeleteAll)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
