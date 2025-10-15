"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ChartData {
  attendanceData: Array<{ month: string; present: number; absent: number }>
  payrollData: Array<{ month: string; amount: number }>
  departmentData: Array<{ name: string; value: number; color: string }>
  loanTrendsData: Array<{ month: string; loans: number; amount: number }>
}

export function AdminDashboardCharts() {
  const [chartData, setChartData] = useState<ChartData>({
    attendanceData: [],
    payrollData: [],
    departmentData: [],
    loanTrendsData: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChartData() {
      try {
        const response = await fetch('/api/dashboard/charts')
        const data = await response.json()
        setChartData(data)
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  if (loading) {
    return <div className="space-y-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent className="h-[300px] bg-gray-50 animate-pulse"></CardContent>
        </Card>
      ))}
    </div>
  }
  return (
    <div className="space-y-6">
      {/* Attendance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trends</CardTitle>
          <CardDescription>Monthly attendance vs absence rates</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="present"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="absent"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payroll Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payroll</CardTitle>
          <CardDescription>Payroll expenses over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.payrollData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip 
                formatter={(value) => [`₱${value.toLocaleString()}`, "Amount"]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Personnel by Department</CardTitle>
          <CardDescription>Distribution of employees across departments</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.departmentData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {chartData.departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Loan Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Statistics</CardTitle>
          <CardDescription>Active loans count and total amount</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.loanTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value, name) => [
                  name === "loans" ? value : `₱${value.toLocaleString()}`,
                  name === "loans" ? "Loans Count" : "Total Amount"
                ]}
              />
              <Bar yAxisId="left" dataKey="loans" fill="#f59e0b" />
              <Bar yAxisId="right" dataKey="amount" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
