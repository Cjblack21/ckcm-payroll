import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  basicSalary: z.number().min(0).optional(),
  isActive: z.boolean().optional()
})

// GET /api/admin/personnel-types/[id] - Get single personnel type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const personnelType = await prisma.personnelType.findUnique({
      where: { personnel_types_id: resolvedParams.id }
    })

    if (!personnelType) {
      return NextResponse.json({ error: 'Personnel type not found' }, { status: 404 })
    }

    return NextResponse.json(personnelType)
  } catch (error) {
    console.error('Error fetching personnel type:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/personnel-types/[id] - Update personnel type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const validatedData = updateSchema.parse(body)

    // Check if personnel type exists
    const existingPersonnelType = await prisma.personnelType.findUnique({
      where: { personnel_types_id: resolvedParams.id }
    })

    if (!existingPersonnelType) {
      return NextResponse.json({ error: 'Personnel type not found' }, { status: 404 })
    }

    // Check if name is already taken (if name is being updated)
    if (validatedData.name && validatedData.name !== existingPersonnelType.name) {
      const nameExists = await prisma.personnelType.findFirst({
        where: { 
          name: validatedData.name,
          personnel_types_id: { not: resolvedParams.id }
        }
      })
      
      if (nameExists) {
        return NextResponse.json(
          { error: 'Personnel type with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Update personnel type
    const updatedPersonnelType = await prisma.personnelType.update({
      where: { personnel_types_id: resolvedParams.id },
      data: validatedData
    })

    return NextResponse.json(updatedPersonnelType)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating personnel type:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/personnel-types/[id] - Delete personnel type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    // Check if personnel type exists
    const existingPersonnelType = await prisma.personnelType.findUnique({
      where: { personnel_types_id: resolvedParams.id }
    })

    if (!existingPersonnelType) {
      return NextResponse.json({ error: 'Personnel type not found' }, { status: 404 })
    }

    // Check if any users are assigned to this personnel type
    const usersWithThisType = await prisma.user.count({
      where: { personnel_types_id: resolvedParams.id }
    })

    if (usersWithThisType > 0) {
      return NextResponse.json(
        { error: `Cannot delete personnel type. ${usersWithThisType} user(s) are assigned to this type.` },
        { status: 400 }
      )
    }

    // Delete personnel type
    await prisma.personnelType.delete({
      where: { personnel_types_id: resolvedParams.id }
    })

    return NextResponse.json({ message: 'Personnel type deleted successfully' })
  } catch (error) {
    console.error('Error deleting personnel type:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}











