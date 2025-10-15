import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  basicSalary: z.number().min(0),
  isActive: z.boolean().optional().default(true)
})

function parseSalary(input: string): number {
  const s = input.trim().toLowerCase().replace(/[,\s]/g, "")
  const match = s.match(/^(\d*\.?\d+)([kmb])?$/)
  if (!match) return Number(s) || 0
  const num = Number(match[1])
  const suffix = match[2]
  if (suffix === 'k') return num * 1_000
  if (suffix === 'm') return num * 1_000_000
  if (suffix === 'b') return num * 1_000_000_000
  return num
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const types = await prisma.personnelType.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(types)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    
    // Check if personnel type with same name already exists
    const existing = await prisma.personnelType.findFirst({
      where: { name: data.name }
    })
    
    if (existing) {
      return NextResponse.json({ error: 'Personnel type with this name already exists' }, { status: 400 })
    }
    
    const created = await prisma.personnelType.create({ 
      data: { 
        name: data.name, 
        basicSalary: data.basicSalary,
        isActive: data.isActive
      } 
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}









