import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log("[Settings API GET] Session:", { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userRole: session?.user?.role 
    })

    if (!session?.user?.id) {
      console.log("[Settings API GET] Unauthorized - no user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create user settings
    let settings = await prisma.userSettings.findUnique({
      where: { users_id: session.user.id },
    })

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          users_id: session.user.id,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log("[Settings API PUT] Session:", { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userRole: session?.user?.role 
    })

    if (!session?.user?.id) {
      console.log("[Settings API PUT] Unauthorized - no user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      theme,
      language,
      emailNotifications,
      payrollNotifications,
      systemNotifications,
      attendanceReminders,
    } = body

    // Update or create settings
    const settings = await prisma.userSettings.upsert({
      where: { users_id: session.user.id },
      update: {
        theme,
        language,
        emailNotifications,
        payrollNotifications,
        systemNotifications,
        attendanceReminders,
      },
      create: {
        users_id: session.user.id,
        theme,
        language,
        emailNotifications,
        payrollNotifications,
        systemNotifications,
        attendanceReminders,
      },
    })

    return NextResponse.json({ settings, message: "Settings updated successfully" })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
