import { NextResponse } from "next/server"
import { getCalendarEvents } from "@/lib/dashboard-data"

export async function GET() {
  try {
    const calendarData = await getCalendarEvents()
    return NextResponse.json(calendarData)
  } catch (error) {
    console.error("Error fetching calendar data:", error)
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    )
  }
}

