"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Clock, User, Search, Calendar, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { getCurrentDayAttendance, getPersonnelAttendance, getPersonnelHistory, type AttendanceRecord, type PersonnelAttendance } from "@/lib/actions/attendance"
import toast from "react-hot-toast"

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "NON_WORKING" | "PENDING"

type AttendanceRecord = {
  attendances_id: string
  users_id: string
  date: string
  timeIn: string | null
  timeOut: string | null
  status: AttendanceStatus
  user: {
    users_id: string
    name: string | null
    email: string
    personnelType?: {
      basicSalary: number
    }
  }
  workHours: number
  earnings: number
  deductions: number
}

type PersonnelAttendance = {
  users_id: string
  name: string | null
  email: string
  personnelType?: {
    name: string
    basicSalary: number
  }
  totalDays: number
  presentDays: number
  absentDays: number
  totalHours: number
  totalEarnings: number
  totalDeductions: number
}

type ViewMode = "current-day" | "personnel" | "all-attendance"

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

  const itemsPerPage = 50

  // Load data based on view mode
  useEffect(() => {
    loadData()
    loadAttendanceSettings()
  }, [viewMode, dateFilter, currentPage])

  // Auto-refresh removed to prevent errors and ensure real-time deductions are displayed correctly

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
      } else if (viewMode === "personnel") {
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
      } else if (viewMode === "all-attendance") {
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

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (viewMode === "personnel") {
      return personnelData.filter(person => 
        (person.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         person.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    } else {
      return attendanceData.filter(record => 
        (record.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         record.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
  }, [attendanceData, personnelData, searchTerm, viewMode])

  const getStatusBadge = (status: AttendanceStatus) => {
    const variants = {
      PRESENT: "default",
      ABSENT: "destructive",
      LATE: "secondary",
      NON_WORKING: "outline",
      PENDING: "secondary",
    } as const

    const labels = {
      PRESENT: "Present",
      ABSENT: "Absent",
      LATE: "Late",
      NON_WORKING: "Non-Working",
      PENDING: "Pending",
    }

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    )
  }

  const formatTime = (time: string | null) => {
    if (!time) return "—"
    // Convert to Philippine time and format in 12-hour format
    return formatInTimeZone(new Date(time), "Asia/Manila", "h:mm a")
  }

  const formatWorkHours = (hours: number) => {
    return `${hours.toFixed(2)} hrs`
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
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
          <h2 className="text-3xl font-bold tracking-tight">Attendance Management</h2>
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
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Current Attendance Period</h3>
                <p className="text-sm text-blue-700">
                  {new Date(attendanceSettings.periodStart).toLocaleDateString()} - {new Date(attendanceSettings.periodEnd).toLocaleDateString()}
                  {" "}({(() => {
                    const start = new Date(attendanceSettings.periodStart)
                    const end = new Date(attendanceSettings.periodEnd)
                    let days = 0
                    const current = new Date(start)
                    while (current <= end) {
                      if (current.getDay() !== 0) days++ // Exclude Sundays
                      current.setDate(current.getDate() + 1)
                    }
                    return days
                  })()} working days)
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-700">
                  Auto-Mark: {attendanceSettings.autoMarkAbsent ? '✅ Absent' : '❌ Absent'} | {attendanceSettings.autoMarkLate ? '✅ Late' : '❌ Late'}
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
                onClick={() => setViewMode("current-day")}
                size="sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Current Day
              </Button>
              <Button
                variant={viewMode === "personnel" ? "default" : "outline"}
                onClick={() => setViewMode("personnel")}
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                Personnel View
              </Button>
              <Button
                variant={viewMode === "all-attendance" ? "default" : "outline"}
                onClick={() => setViewMode("all-attendance")}
                size="sm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                All Attendance
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
            
            {viewMode === "all-attendance" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFilter ? format(dateFilter, "yyyy-MM-dd") : ""}
                  onChange={(e) => setDateFilter(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-auto"
                />
                {dateFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter(undefined)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Current Day View */}
          {viewMode === "current-day" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Deductions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((record) => (
                  <TableRow key={record.attendances_id}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {getInitials(record.user.name, record.user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.user.name || record.user.email}
                    </TableCell>
                    <TableCell>{record.user.email}</TableCell>
                    <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {record.status === 'PENDING' ? 'Not yet' : formatTime(record.timeIn)}
                    </TableCell>
                    <TableCell>
                      {record.status === 'PENDING' ? '—' : formatTime(record.timeOut)}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{formatWorkHours(record.workHours)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(record.earnings)}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(record.deductions)}</TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No attendance records found for today.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* Personnel View */}
          {viewMode === "personnel" && (
            <div className="w-full overflow-x-auto">
              <Table className="w-full table-auto text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>School ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Personnel Type</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        {personnelData.length === 0 ? 'No personnel data available. Please check if personnel types are assigned.' : 'No personnel found matching your search.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredData.map((person) => (
                    <TableRow key={person.users_id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {getInitials(person.name, person.email)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {person.users_id}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {person.name || person.email}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[260px] truncate">{person.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {person.personnelType?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{person.totalDays}</TableCell>
                      <TableCell className="text-green-600 whitespace-nowrap">{person.presentDays}</TableCell>
                      <TableCell className="text-red-600 whitespace-nowrap">{person.absentDays}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatWorkHours(person.totalHours)}</TableCell>
                      <TableCell className="text-green-600 whitespace-nowrap">{formatCurrency(person.totalEarnings)}</TableCell>
                      <TableCell className="text-red-600 whitespace-nowrap">{formatCurrency(person.totalDeductions)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedPersonnel(person)
                                loadPersonnelHistory(person.users_id)
                              }}
                            >
                              View Attendance
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Attendance History - {person.name || person.email}</DialogTitle>
                              <DialogDescription>
                                Complete attendance record for this personnel
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 w-full overflow-x-auto">
                              <Table className="w-full table-fixed">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[140px]">Date</TableHead>
                                      <TableHead className="w-[120px]">Time In</TableHead>
                                      <TableHead className="w-[120px]">Time Out</TableHead>
                                      <TableHead className="w-[120px]">Status</TableHead>
                                      <TableHead className="w-[130px]">Work Hours</TableHead>
                                      <TableHead className="w-[140px]">Earnings</TableHead>
                                      <TableHead className="w-[150px]">Cumulative Deductions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {personnelAttendanceHistory.map((record) => (
                                      <TableRow key={record.attendances_id}>
                                        <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                                        <TableCell>{formatTime(record.timeIn)}</TableCell>
                                        <TableCell>{formatTime(record.timeOut)}</TableCell>
                                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                                        <TableCell>{formatWorkHours(record.workHours)}</TableCell>
                                        <TableCell className="text-green-600">{formatCurrency(record.earnings)}</TableCell>
                                        <TableCell className="text-red-600 font-medium">{formatCurrency(record.deductions)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                              </Table>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* All Attendance View */}
          {viewMode === "all-attendance" && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Deductions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => (
                    <TableRow key={record.attendances_id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {getInitials(record.user.name, record.user.email)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.user.name || record.user.email}
                      </TableCell>
                      <TableCell>{record.user.email}</TableCell>
                      <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{formatTime(record.timeIn)}</TableCell>
                      <TableCell>{formatTime(record.timeOut)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{formatWorkHours(record.workHours)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(record.earnings)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(record.deductions)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredData.length} records
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">Page {currentPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={filteredData.length < itemsPerPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
