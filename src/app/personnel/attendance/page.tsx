"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Calendar, 
  Clock, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

type AttendanceRecord = {
  id: string
  date: string
  status: string
  timeIn: string | null
  timeOut: string | null
  hours: string
  dayOfWeek: string
}

type AttendanceData = {
  records: AttendanceRecord[]
  statistics: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendanceRate: number
    totalHours: string
  }
  period: {
    startDate: string
    endDate: string
  }
}

export default function PersonnelAttendance() {
  const [data, setData] = useState<AttendanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const loadAttendanceData = async (month?: number, year?: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (month) params.append('month', month.toString())
      if (year) params.append('year', year.toString())
      
      const res = await fetch(`/api/personnel/attendance?${params.toString()}`)
      if (res.ok) {
        const attendanceData = await res.json()
        setData(attendanceData)
      } else {
        console.error('Failed to load attendance data')
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttendanceData(currentMonth, currentYear)
  }, [currentMonth, currentYear])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'LATE':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PRESENT: "default" as const,
      ABSENT: "destructive" as const,
      LATE: "secondary" as const,
      PARTIAL: "secondary" as const,
      NON_WORKING: "outline" as const,
      PENDING: "secondary" as const,
    }

    const labels = {
      PRESENT: "Present",
      ABSENT: "Absent",
      LATE: "Late",
      PARTIAL: "Partial",
      NON_WORKING: "Non-Working",
      PENDING: "Pending",
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '—'
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatWorkHours = (hours: string) => {
    const numHours = parseFloat(hours) || 0
    return `${numHours.toFixed(2)} hrs`
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Error</h2>
            <p className="text-muted-foreground">Failed to load attendance data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            Attendance Logs
          </h2>
          <p className="text-muted-foreground">Your attendance history and statistics</p>
        </div>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {getMonthName(currentMonth)} {currentYear}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.attendanceRate}%</div>
            <div className="text-xs text-muted-foreground">
              {data.statistics.presentDays} of {data.statistics.totalDays} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statistics.totalHours}h</div>
            <div className="text-xs text-muted-foreground">
              This month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.statistics.presentDays}</div>
            <div className="text-xs text-muted-foreground">
              Days worked
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.statistics.absentDays}</div>
            <div className="text-xs text-muted-foreground">
              Days missed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[100px]">Day</TableHead>
                  <TableHead className="w-[100px]">Time In</TableHead>
                  <TableHead className="w-[100px]">Time Out</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[100px]">Work Hrs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.length > 0 ? (
                  data.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                      <TableCell className="text-muted-foreground">{record.dayOfWeek}</TableCell>
                      <TableCell>{formatTime(record.timeIn)}</TableCell>
                      <TableCell>{formatTime(record.timeOut)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{formatWorkHours(record.hours)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-12 w-12 text-muted-foreground" />
                        <h3 className="text-lg font-medium">No attendance records</h3>
                        <p className="text-muted-foreground">
                          No attendance records found for {getMonthName(currentMonth)} {currentYear}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

















