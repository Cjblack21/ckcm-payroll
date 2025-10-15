const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Test query
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
