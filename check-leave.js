const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkLeave() {
  try {
    // First check ALL approved leaves
    console.log('=== ALL APPROVED LEAVES ===')
    const allLeaves = await prisma.leaveRequest.findMany({
      where: { status: 'APPROVED' },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${allLeaves.length} approved leave(s) total`)
    allLeaves.forEach((leave, idx) => {
      console.log(`\nLeave #${idx + 1}:`)
      console.log('  User:', leave.user.name, '(' + leave.user.email + ')')
      console.log('  Type:', leave.type)
      console.log('  Start:', leave.startDate.toISOString())
      console.log('  End:', leave.endDate.toISOString())
      console.log('  Days:', leave.days)
      console.log('  Paid:', leave.isPaid)
    })
    
    console.log('\n=== CHECKING SPECIFIC USER ===')
    const email = 'bryllecooked12@pms.com'
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.log('User not found')
      return
    }
    
    console.log('User ID:', user.users_id)
    console.log('User Name:', user.name)
    console.log('---')
    
    // Get all leave requests for this user
    const leaves = await prisma.leaveRequest.findMany({
      where: { users_id: user.users_id },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${leaves.length} leave requests:`)
    console.log('---')
    
    leaves.forEach((leave, idx) => {
      console.log(`Leave #${idx + 1}:`)
      console.log('  Status:', leave.status)
      console.log('  Type:', leave.type)
      console.log('  Start Date:', leave.startDate.toISOString())
      console.log('  End Date:', leave.endDate.toISOString())
      console.log('  Days:', leave.days)
      console.log('  Paid:', leave.isPaid)
      console.log('  Reason:', leave.reason)
      console.log('---')
    })
    
    // Check approved leaves that overlap with today
    const now = new Date()
    console.log('Current time (server):', now.toISOString())
    
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        users_id: user.users_id,
        status: 'APPROVED',
        startDate: { lte: now },
        endDate: { gte: now }
      }
    })
    
    if (approvedLeaves.length > 0) {
      console.log(`Found ${approvedLeaves.length} approved leave(s) overlapping with today`)
      approvedLeaves.forEach(leave => {
        console.log('  -', leave.type, 'from', leave.startDate.toISOString(), 'to', leave.endDate.toISOString())
      })
    } else {
      console.log('No approved leaves overlapping with today')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLeave()
