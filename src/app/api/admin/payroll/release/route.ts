import { NextRequest, NextResponse } from "next/server"
import { releasePayroll } from "@/lib/actions/payroll"

export async function POST(req: NextRequest) {
  const { entryIds } = await req.json()
  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return NextResponse.json({ success: false, error: "entryIds array is required" }, { status: 400 })
  }
  const result = await releasePayroll(entryIds)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || "Failed to release payroll" }, { status: 500 })
  }
  return NextResponse.json({ success: true, message: result.message || "Payroll released" })
}



