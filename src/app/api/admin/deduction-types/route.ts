import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const typeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  isActive: z.boolean().optional().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Exclude attendance-related deduction types - these are automatically managed by the attendance system
  const attendanceRelatedTypes = ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Partial Attendance', 'Early Time-Out']
  const types = await prisma.deductionType.findMany({
    where: {
      name: {
        notIn: attendanceRelatedTypes
      }
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(types)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const data = typeSchema.parse(body)
    
    // Prevent creation of attendance-related deduction types
    const attendanceRelatedTypes = ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Partial Attendance', 'Early Time-Out']
    if (attendanceRelatedTypes.some(type => data.name.toLowerCase().includes(type.toLowerCase()))) {
      return NextResponse.json({ error: 'Cannot create attendance-related deduction types. These are automatically managed by the attendance system.' }, { status: 400 })
    }
    
    const created = await prisma.deductionType.create({ data })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Error creating deduction type:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ 
      error: "Failed to create", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}




