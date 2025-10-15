import { NextResponse } from "next/server"
import { 
  getAttendanceTrends, 
  getPayrollTrends, 
  getDepartmentDistribution, 
  getLoanTrends 
} from "@/lib/dashboard-data"

export async function GET() {
  try {
    const [attendanceData, payrollData, departmentData, loanTrendsData] = await Promise.all([
      getAttendanceTrends(),
      getPayrollTrends(),
      getDepartmentDistribution(),
      getLoanTrends()
    ])

    return NextResponse.json({
      attendanceData,
      payrollData,
      departmentData,
      loanTrendsData
    })
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    )
  }
}

