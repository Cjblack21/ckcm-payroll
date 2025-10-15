import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const personnelTypes = await prisma.personnelType.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        personnel_types_id: true,
        name: true,
        basicSalary: true,
        isActive: true
      }
    })

    // Convert Decimal to number for serialization
    const serializedPersonnelTypes = personnelTypes.map(type => ({
      ...type,
      basicSalary: Number(type.basicSalary)
    }))

    return NextResponse.json(serializedPersonnelTypes)
  } catch (error) {
    console.error('Error fetching personnel types:', error)
    return NextResponse.json({ error: 'Failed to fetch personnel types' }, { status: 500 })
  }
}

