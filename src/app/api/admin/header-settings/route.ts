import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get header settings from database or return defaults
    let settings = await prisma.headerSettings.findFirst()

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.headerSettings.create({
        data: {
          schoolName: "TUBOD BARANGAY POBLACION",
          schoolAddress: "Tubod, Lanao del Norte",
          systemName: "POBLACION - PMS",
          logoUrl: "/brgy-logo.png",
          showLogo: true,
          headerAlignment: 'center',
          fontSize: 'medium',
          customText: "",
          workingDays: JSON.stringify(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        }
      })
    }

    // Parse workingDays from JSON string to array
    const parsedSettings = {
      ...settings,
      workingDays: typeof settings.workingDays === 'string'
        ? JSON.parse(settings.workingDays)
        : settings.workingDays
    }

    return NextResponse.json(parsedSettings)

  } catch (error) {
    console.error('Error fetching header settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch header settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      schoolName,
      schoolAddress,
      systemName,
      logoUrl,
      showLogo,
      headerAlignment,
      fontSize,
      customText,
      workingDays
    } = body

    // Validate required fields
    if (!schoolName || !schoolAddress || !systemName) {
      return NextResponse.json(
        { error: 'School name, address, and system name are required' },
        { status: 400 }
      )
    }

    // Check if settings exist
    const existingSettings = await prisma.headerSettings.findFirst()

    let settings
    if (existingSettings) {
      // Update existing settings
      settings = await prisma.headerSettings.update({
        where: { id: existingSettings.id },
        data: {
          schoolName,
          schoolAddress,
          systemName,
          logoUrl: logoUrl || "/brgy-logo.png",
          showLogo: showLogo !== undefined ? showLogo : true,
          headerAlignment: headerAlignment || 'center',
          fontSize: fontSize || 'medium',
          customText: customText || "",
          workingDays: JSON.stringify(workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        }
      })
    } else {
      // Create new settings
      settings = await prisma.headerSettings.create({
        data: {
          schoolName,
          schoolAddress,
          systemName,
          logoUrl: logoUrl || "/brgy-logo.png",
          showLogo: showLogo !== undefined ? showLogo : true,
          headerAlignment: headerAlignment || 'center',
          fontSize: fontSize || 'medium',
          customText: customText || "",
          workingDays: JSON.stringify(workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        }
      })
    }

    return NextResponse.json({
      message: 'Header settings saved successfully',
      settings
    })

  } catch (error) {
    console.error('Error saving header settings:', error)
    return NextResponse.json(
      { error: 'Failed to save header settings' },
      { status: 500 }
    )
  }
}









