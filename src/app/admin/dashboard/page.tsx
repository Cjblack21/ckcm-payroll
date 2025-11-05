import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Wallet, 
  UserCheck, 
  UserX, 
  Banknote, 
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Home
} from "lucide-react"
import { AdminDashboardCharts } from "@/components/admin-dashboard-charts"
import { AdminCalendar } from "@/components/admin-calendar"
import { getDashboardStats } from "@/lib/dashboard-data"
import Link from "next/link"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  // Get real data from database
  const dashboardStats = await getDashboardStats()
  
  const attendanceRate = dashboardStats.totalPersonnel > 0 
    ? ((dashboardStats.attendanceToday / dashboardStats.totalPersonnel) * 100).toFixed(1)
    : "0"
    
  const absentRate = dashboardStats.totalPersonnel > 0 
    ? ((dashboardStats.absentToday / dashboardStats.totalPersonnel) * 100).toFixed(1)
    : "0"

  const stats = [
    {
      title: "Total Personnel",
      value: dashboardStats.totalPersonnel.toString(),
      description: "Active employees",
      icon: Users,
      trend: "stable",
      color: "text-blue-600",
      borderColor: "border-l-blue-500",
      href: "/admin/user-management"
    },
    {
      title: "Monthly Payroll",
      value: `₱${Math.round(Number(dashboardStats.monthlyPayroll)).toLocaleString()}`,
      description: "Current month total", 
      icon: Wallet,
      trend: "up",
      color: "text-green-600",
      borderColor: "border-l-green-500",
      href: "/admin/payroll"
    },
    {
      title: "Attendance Today",
      value: `${dashboardStats.attendanceToday} / ${dashboardStats.totalPersonnel}`,
      description: `Present: ${dashboardStats.attendanceToday} • Absent: ${dashboardStats.absentToday}`,
      icon: UserCheck,
      trend: "stable",
      color: "text-blue-600",
      borderColor: "border-l-blue-500",
      href: "/admin/attendance"
    },
    {
      title: "Active Loans",
      value: dashboardStats.activeLoans.toString(),
      description: `₱${dashboardStats.totalLoanAmount.toLocaleString()} total`,
      icon: Banknote,
      trend: "stable",
      color: "text-orange-600",
      borderColor: "border-l-orange-500",
      href: "/admin/loans"
    },
    {
      title: "Holidays This Month",
      value: dashboardStats.holidaysThisMonth.toString(),
      description: "Scheduled holidays",
      icon: CalendarIcon,
      trend: "stable",
      color: "text-purple-600",
      borderColor: "border-l-purple-500",
      href: "/admin/holidays"
    },
    {
      title: "Total Deductions",
      value: `₱${Math.round(Number(dashboardStats.totalDeductions)).toLocaleString()}`,
      description: "Current month total",
      icon: FileText,
      trend: "stable",
      color: "text-red-600",
      borderColor: "border-l-red-500",
      href: "/admin/deductions"
    },
  ]

  return (
    <div className="flex-1 space-y-8 p-4 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Home className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          Welcome back, {session?.user.name}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your CKCM Payroll Management System today.
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">OVERVIEW</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          const TrendIcon = stat.trend === "up" ? ArrowUpRight : stat.trend === "down" ? ArrowDownRight : null
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className={`cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 ${stat.borderColor}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {TrendIcon && <TrendIcon className="h-3 w-3" />}
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminDashboardCharts />
        </div>
        <div className="lg:col-span-1">
          <AdminCalendar />
        </div>
      </div>
    </div>
  )
}
