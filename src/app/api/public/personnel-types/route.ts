import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const personnelTypes = await prisma.personnelType.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        department: 'asc',
        name: 'asc'
      },
      select: {
        personnel_types_id: true,
        name: true,
        type: true,
        department: true,
        basicSalary: true,
        isActive: true
      }
    })

    return NextResponse.json(personnelTypes)
  } catch (error) {
    console.error('Error fetching personnel types:', error)
    return NextResponse.json({ error: 'Failed to fetch personnel types' }, { status: 500 })
  }
}
