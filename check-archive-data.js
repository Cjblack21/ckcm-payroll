const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkArchiveData() {
  try {
    console.log('🔍 Checking archive data...\n')

    // Check payroll entries
    const totalPayrolls = await prisma.payrollEntry.count()
    const releasedPayrolls = await prisma.payrollEntry.count({
      where: { status: 'RELEASED' }
    })
    const archivedPayrolls = await prisma.payrollEntry.count({
      where: { status: 'ARCHIVED' }
    })
    const releasedOrArchived = await prisma.payrollEntry.count({
      where: { status: { in: ['RELEASED', 'ARCHIVED'] } }
    })

    console.log('📊 PAYROLL ENTRIES:')
    console.log(`   Total payroll entries: ${totalPayrolls}`)
    console.log(`   RELEASED status: ${releasedPayrolls}`)
    console.log(`   ARCHIVED status: ${archivedPayrolls}`)
    console.log(`   RELEASED or ARCHIVED: ${releasedOrArchived}`)
    
    if (releasedOrArchived > 0) {
      const sample = await prisma.payrollEntry.findFirst({
        where: { status: { in: ['RELEASED', 'ARCHIVED'] } },
        select: {
          status: true,
          periodStart: true,
          periodEnd: true,
          netPay: true,
          releasedAt: true
        }
      })
      console.log('   Sample entry:', JSON.stringify(sample, null, 2))
    }

    console.log('\n💰 LOANS:')
    const totalLoans = await prisma.loan.count()
    const archivedLoans = await prisma.loan.count({
      where: { archivedAt: { not: null } }
    })
    console.log(`   Total loans: ${totalLoans}`)
    console.log(`   Archived loans (archivedAt IS NOT NULL): ${archivedLoans}`)
    
    if (archivedLoans > 0) {
      const sample = await prisma.loan.findFirst({
        where: { archivedAt: { not: null } },
        select: {
          loans_id: true,
          amount: true,
          status: true,
          archivedAt: true
        }
      })
      console.log('   Sample loan:', JSON.stringify(sample, null, 2))
    }

    console.log('\n✅ Check complete!')
    
    if (releasedOrArchived === 0 && archivedLoans === 0) {
      console.log('\n⚠️  NO ARCHIVED DATA FOUND!')
      console.log('   The archive page will show zeros because:')
      console.log('   1. No payroll entries with RELEASED or ARCHIVED status')
      console.log('   2. No loans with archivedAt timestamp')
      console.log('\n💡 To fix this:')
      console.log('   - Release some payrolls to see them in the archive')
      console.log('   - Archive some loans using the loan management page')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkArchiveData()
