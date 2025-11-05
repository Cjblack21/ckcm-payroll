import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Function to generate a 6-digit random number
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Function to check if ID already exists
async function idExists(id: string) {
  const user = await prisma.user.findUnique({
    where: { users_id: id }
  })
  return !!user
}

// Function to generate unique 6-digit ID
async function generateUniqueId() {
  let id
  do {
    id = generateSixDigitId()
  } while (await idExists(id))
  return id
}

async function main() {
  console.log('🌱 Starting database seeding...')

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create Admin user
  const adminId = await generateUniqueId()
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pms.com' },
    update: {},
    create: {
      users_id: adminId,
      email: 'admin@pms.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  })

  // Create Personnel users
  const personnel1Id = await generateUniqueId()
  const personnel1 = await prisma.user.upsert({
    where: { email: 'john.doe@pms.com' },
    update: {},
    create: {
      users_id: personnel1Id,
      email: 'john.doe@pms.com',
      password: hashedPassword,
      name: 'John Doe',
      role: 'PERSONNEL',
      isActive: true,
    },
  })

  const personnel2Id = await generateUniqueId()
  const personnel2 = await prisma.user.upsert({
    where: { email: 'jane.smith@pms.com' },
    update: {},
    create: {
      users_id: personnel2Id,
      email: 'jane.smith@pms.com',
      password: hashedPassword,
      name: 'Jane Smith',
      role: 'PERSONNEL',
      isActive: true,
    },
  })

  const personnel3Id = await generateUniqueId()
  const personnel3 = await prisma.user.upsert({
    where: { email: 'mike.johnson@pms.com' },
    update: {},
    create: {
      users_id: personnel3Id,
      email: 'mike.johnson@pms.com',
      password: hashedPassword,
      name: 'Mike Johnson',
      role: 'PERSONNEL',
      isActive: true,
    },
  })

  // Seed default deduction types if not present
  const defaultTypes = [
    { name: 'Late Penalty', description: 'Penalty for late arrival', amount: 0 },
    { name: 'Uniform', description: 'Uniform payment deduction', amount: 0 },
    { name: 'PhilHealth', description: 'Philippine Health Insurance Corporation', amount: 0 },
    { name: 'SSS', description: 'Social Security System', amount: 0 },
    { name: 'Pag-IBIG', description: 'Home Development Mutual Fund', amount: 0 },
  ]
  for (const t of defaultTypes) {
    await prisma.deductionType.upsert({
      where: { name: t.name },
      update: {},
      create: { name: t.name, description: t.description, amount: t.amount, isActive: true },
    })
  }

  console.log('✅ Seeding completed successfully!')
  console.log('\n📋 Default Users Created:')
  console.log('┌─────────────────────────────────────────────────────────┐')
  console.log('│                    Login Credentials                    │')
  console.log('├─────────────────────────────────────────────────────────┤')
  console.log('│ ADMIN ACCOUNT:                                          │')
  console.log(`│ ID: ${adminId}                                           │`)
  console.log('│ Email: admin@pms.com                                    │')
  console.log('│ Password: password123                                   │')
  console.log('│ Role: Admin                                             │')
  console.log('├─────────────────────────────────────────────────────────┤')
  console.log('│ PERSONNEL ACCOUNTS:                                     │')
  console.log(`│ ID: ${personnel1Id} - Email: john.doe@pms.com            │`)
  console.log(`│ ID: ${personnel2Id} - Email: jane.smith@pms.com          │`)
  console.log(`│ ID: ${personnel3Id} - Email: mike.johnson@pms.com        │`)
  console.log('│ Password: password123 (for all personnel)              │')
  console.log('│ Role: Personnel                                         │')
  console.log('└─────────────────────────────────────────────────────────┘')

  console.log('\n🚀 You can now login with any of these accounts!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

