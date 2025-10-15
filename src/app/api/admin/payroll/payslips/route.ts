import { NextRequest, NextResponse } from "next/server"
import { generatePayslips } from "@/lib/actions/payroll"

export async function POST(req: NextRequest) {
  const { periodStart, periodEnd } = await req.json().catch(() => ({ }))
  const result = await generatePayslips(periodStart, periodEnd)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || "Failed to generate payslips" }, { status: 500 })
  }
  return NextResponse.json({
    success: true,
    payslips: result.payslips,
    headerSettings: result.headerSettings
  })
}



