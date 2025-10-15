"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Clock, 
  Calendar, 
  User, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
  CreditCard
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

type DashboardData = {
  user: {
    name: string
    email: string
    position: string
    basicSalary: number
    periodSalary: number
  }
  todayStatus: {
    status: string
    timeIn: string | null
    timeOut: string | null
    hours: number
  }
  monthlyAttendance: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendanceRate: string
  }
  currentPayroll: {
    status: string
    netPay: number
    basicSalary: number
    deductions: number
    releasedAt: string | null
  }
  nextPayout: {
    date: string
    amount: number
    period: string
  }
  deductions: Array<{
    name: string
    amount: number
    appliedAt: string
  }>
  loans: Array<{
    purpose: string
    balance: number
    monthlyPayment: number
    perPayrollPayment: number
    termMonths: number
  }>
}

export default function PersonnelDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/personnel/dashboard', { cache: 'no-store' })
        if (!res.ok) {
          console.error('Failed to load dashboard data')
          return
        }
        const payload = await res.json()
        const dashboardData: DashboardData = {
          user: {
            name: payload.user?.name || 'User',
            email: payload.user?.email || 'user@example.com',
            position: payload.user?.position || 'Employee',
            basicSalary: payload.user?.basicSalary || 0,
            periodSalary: payload.user?.periodSalary || 0,
          },
          todayStatus: {
            status: payload.todayStatus?.status || 'ABSENT',
            timeIn: payload.todayStatus?.timeIn || null,
            timeOut: payload.todayStatus?.timeOut || null,
            hours: payload.todayStatus?.hours || 0,
          },
          monthlyAttendance: {
            totalDays: payload.monthlyAttendance?.totalDays || 0,
            presentDays: payload.monthlyAttendance?.presentDays || 0,
            absentDays: payload.monthlyAttendance?.absentDays || 0,
            lateDays: payload.monthlyAttendance?.lateDays || 0,
            attendanceRate: `${payload.monthlyAttendance?.attendanceRate || '0'}`,
          },
          currentPayroll: {
            status: payload.currentPayroll?.status || 'PENDING',
            netPay: payload.currentPayroll?.netPay || 0,
            basicSalary: payload.currentPayroll?.basicSalary || 0,
            deductions: payload.currentPayroll?.deductions || 0,
            releasedAt: payload.currentPayroll?.releasedAt || null,
          },
          nextPayout: {
            date: payload.nextPayout?.date || '',
            amount: payload.nextPayout?.amount || 0,
            period: payload.nextPayout?.period || '',
          },
          deductions: payload.deductions || [],
          loans: payload.loans || [],
        }
        setData(dashboardData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

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
            <p className="text-muted-foreground">Failed to load dashboard data</p>
          </div>
        </div>
      </div>
    )
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800'
      case 'ABSENT':
        return 'bg-red-100 text-red-800'
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back, {data.user.name}!</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
            {getStatusIcon(data.todayStatus.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge className={getStatusColor(data.todayStatus.status)}>
                {data.todayStatus.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {data.todayStatus.timeIn && (
                <div>Time In: {new Date(data.todayStatus.timeIn).toLocaleTimeString()}</div>
              )}
              {data.todayStatus.timeOut && (
                <div>Time Out: {new Date(data.todayStatus.timeOut).toLocaleTimeString()}</div>
              )}
              <div>Hours: {data.todayStatus.hours}</div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.monthlyAttendance.attendanceRate}%</div>
            <div className="text-xs text-muted-foreground">
              {data.monthlyAttendance.presentDays} present, {data.monthlyAttendance.absentDays} absent
            </div>
            <div className="text-xs text-muted-foreground">
              {data.monthlyAttendance.lateDays} late days
            </div>
          </CardContent>
        </Card>

        {/* Position */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Position</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.user.position}</div>
            <div className="text-xs text-muted-foreground">
              Monthly Salary: ₱{data.user.basicSalary.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Current Salary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Period Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{data.currentPayroll.netPay.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Status: <Badge variant={data.currentPayroll.status === 'RELEASED' ? 'default' : 'secondary'}>
                {data.currentPayroll.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Payout Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Next Payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Amount</div>
              <div className="text-2xl font-bold">₱{data.nextPayout.amount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Period</div>
              <div className="text-lg font-semibold">{data.nextPayout.period}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Release Date</div>
              <div className="text-lg font-semibold">
                {new Date(data.nextPayout.date).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions and Loans */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Deductions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.deductions?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {data.deductions!.map((deduction, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{deduction.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(deduction.appliedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-semibold">₱{deduction.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No deductions for current period</div>
            )}
          </CardContent>
        </Card>

        {/* Active Loans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.loans?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {data.loans!.map((loan, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{loan.purpose}</div>
                      <div className="text-sm text-muted-foreground">
                        {loan.termMonths} months remaining
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₱{loan.perPayrollPayment.toLocaleString()}/payroll</div>
                      <div className="text-sm text-muted-foreground">
                        Balance: ₱{loan.balance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No active loans</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

