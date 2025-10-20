const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSettings() {
  const settings = await prisma.attendanceSettings.findFirst()
  console.log('Attendance Settings:')
  console.log('Period Start:', settings?.periodStart)
  console.log('Period End:', settings?.periodEnd)
  await prisma.$disconnect()
}

checkSettings()
