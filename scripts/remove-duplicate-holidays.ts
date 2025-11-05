import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeDuplicateHolidays() {
  try {
    console.log('🔍 Checking for duplicate holidays...')

    // Get all holidays
    const allHolidays = await prisma.holiday.findMany({
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    console.log(`📊 Total holidays in database: ${allHolidays.length}`)

    // Group by date
    const holidaysByDate = new Map<string, typeof allHolidays>()
    
    for (const holiday of allHolidays) {
      const dateKey = holiday.date.toISOString().split('T')[0]
      if (!holidaysByDate.has(dateKey)) {
        holidaysByDate.set(dateKey, [])
      }
      holidaysByDate.get(dateKey)!.push(holiday)
    }

    // Find and remove duplicates
    let duplicatesFound = 0
    let duplicatesRemoved = 0

    for (const [dateKey, holidays] of holidaysByDate.entries()) {
      if (holidays.length > 1) {
        duplicatesFound += holidays.length - 1
        console.log(`\n📅 Found ${holidays.length} holidays on ${dateKey}:`)
        
        holidays.forEach((h, index) => {
          console.log(`  ${index + 1}. ${h.name} (${h.type}) - ID: ${h.holidays_id} - Created: ${h.createdAt}`)
        })

        // Keep the oldest one (first created), delete the rest
        const toKeep = holidays[0]
        const toDelete = holidays.slice(1)

        console.log(`  ✅ Keeping: ${toKeep.name} (ID: ${toKeep.holidays_id})`)
        
        for (const holiday of toDelete) {
          console.log(`  ❌ Deleting: ${holiday.name} (ID: ${holiday.holidays_id})`)
          await prisma.holiday.delete({
            where: { holidays_id: holiday.holidays_id }
          })
          duplicatesRemoved++
        }
      }
    }

    if (duplicatesFound === 0) {
      console.log('\n✅ No duplicate holidays found!')
    } else {
      console.log(`\n✅ Removed ${duplicatesRemoved} duplicate holidays`)
      console.log(`📊 Remaining holidays: ${allHolidays.length - duplicatesRemoved}`)
    }

    // Show final count
    const finalCount = await prisma.holiday.count()
    console.log(`\n📊 Final holiday count: ${finalCount}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeDuplicateHolidays()

