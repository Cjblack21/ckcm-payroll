'use server'

import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createUserAccount(data: {
  email: string
  name: string
  schoolId: string
  personnelTypeId: string
  department?: string
  image?: string
}): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Check if school ID is already taken
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { users_id: data.schoolId }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === data.email) {
        return { success: false, error: 'An account with this email already exists' }
      }
      if (existingUser.users_id === data.schoolId) {
        return { success: false, error: 'This School ID is already taken' }
      }
    }

    // Verify personnel type exists and is active
    const personnelType = await prisma.personnelType.findUnique({
      where: { personnel_types_id: data.personnelTypeId }
    })

    if (!personnelType || !personnelType.isActive) {
      return { success: false, error: 'Selected personnel type is not available' }
    }

    // Create user account
    await prisma.user.create({
      data: {
        users_id: data.schoolId, // Use school ID as the primary key
        email: data.email,
        name: data.name,
        password: '', // No password needed for OAuth users
        role: Role.PERSONNEL,
        personnel_types_id: data.personnelTypeId,
        isActive: true
      }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error creating user account:', error)
    return { success: false, error: 'Failed to create account. Please try again.' }
  }
}

