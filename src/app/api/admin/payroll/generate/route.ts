import { NextResponse } from "next/server"
import { generatePayroll } from "@/lib/actions/payroll"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const result = await generatePayroll()
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Failed to generate payroll" }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: result.message || "Payroll generated" })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate payroll'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
