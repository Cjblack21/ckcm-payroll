import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("avatar") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Create unique filename
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const timestamp = Date.now()
    const filename = `${session.user.id}_${timestamp}${path.extname(file.name)}`
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars")
    await mkdir(uploadsDir, { recursive: true })

    // Save file
    const filepath = path.join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Note: Avatar field not in schema - file saved but not stored in database
    const avatarUrl = `/uploads/avatars/${filename}`

    return NextResponse.json({ 
      message: "Avatar uploaded successfully (file only, not stored in database)",
      avatarUrl 
    })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}
