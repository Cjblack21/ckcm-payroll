import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// Ensure this route is always dynamically rendered
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Validation schema for updates
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'PERSONNEL']).optional(),
  isActive: z.boolean().optional(),
  personnel_types_id: z.string().optional(),
})

// GET /api/admin/users/[id] - Get single user
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
    const user = await prisma.user.findUnique({
      where: { users_id: resolvedParams.id },
      select: {
        users_id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        personnel_types_id: true,
        createdAt: true,
        updatedAt: true,
        personnelType: {
          select: {
            name: true,
            basicSalary: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users/[id] - Update user
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
    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { users_id: resolvedParams.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent admin from deactivating themselves
    if (session.user.id === resolvedParams.id && validatedData.isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Check if email is already taken (if email is being updated)
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })
      
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email is already taken' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    type UpdateShape = { email?: string; name?: string; password?: string; role?: 'ADMIN' | 'PERSONNEL'; isActive?: boolean; personnel_types_id?: string | null }
    const updateData: Partial<UpdateShape> = { ...validatedData }

    // Coerce empty personnel_types_id to null
    if (Object.prototype.hasOwnProperty.call(updateData, 'personnel_types_id')) {
      const v = updateData.personnel_types_id as unknown as string | undefined
      updateData.personnel_types_id = v === '' ? null : v
    }

    // Hash new password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { users_id: resolvedParams.id },
      data: updateData,
      select: {
        users_id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        personnel_types_id: true,
        createdAt: true,
        updatedAt: true,
        personnelType: {
          select: {
            name: true,
            basicSalary: true
          }
        }
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    // Prisma known errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Email is already in use.' }, { status: 400 })
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Invalid personnel type.' }, { status: 400 })
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 })
      }
    }

    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] - Delete user
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

    // Prevent admin from deleting themselves
    if (session.user.id === resolvedParams.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { users_id: resolvedParams.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has related records
    const [attendanceCount, payrollCount, loanCount, deductionCount, leaveCount] = await Promise.all([
      prisma.attendance.count({ where: { users_id: resolvedParams.id } }),
      prisma.payrollEntry.count({ where: { users_id: resolvedParams.id } }),
      prisma.loan.count({ where: { users_id: resolvedParams.id } }),
      prisma.deduction.count({ where: { users_id: resolvedParams.id } }),
      prisma.leaveRequest.count({ where: { users_id: resolvedParams.id } })
    ])

    const totalRelatedRecords = attendanceCount + payrollCount + loanCount + deductionCount + leaveCount

    if (totalRelatedRecords > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with existing records',
          details: `This user has ${attendanceCount} attendance records, ${payrollCount} payroll records, ${loanCount} loans, ${deductionCount} deductions, and ${leaveCount} leave requests. Please deactivate the user instead.`
        },
        { status: 400 }
      )
    }

    // Delete user (this will cascade delete sessions)
    await prisma.user.delete({
      where: { users_id: resolvedParams.id }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    
    // Handle Prisma foreign key constraint error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with existing records',
          details: 'This user has related records in the system. Please deactivate the user instead of deleting.'
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
