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

    // Get all personnel types with user count
    const personnelTypes = await prisma.personnelType.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            users: {
              where: { isActive: true, role: 'PERSONNEL' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Format the response to include user count
    const formattedPersonnelTypes = personnelTypes.map(type => ({
      personnel_types_id: type.personnel_types_id,
      name: type.name,
      basicSalary: Number(type.basicSalary),
      isActive: type.isActive,
      userCount: type._count.users,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt
    }))

    return NextResponse.json({ personnelTypes: formattedPersonnelTypes })
  } catch (error) {
    console.error('Error fetching personnel types for attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personnel types' },
      { status: 500 }
    )
  }
}