import { getNowInPhilippines, toPhilippinesDateString } from '../src/lib/timezone'

const now = getNowInPhilippines()
console.log('🕐 Current Philippines Time:', now.toISOString())
console.log('🕐 Current Date (Philippines):', toPhilippinesDateString(now))
console.log('🕐 Current Hour:', now.getHours())
console.log('🕐 Current Minute:', now.getMinutes())

// Test cutoff at 11:00 AM
const cutoffTime = '11:00'
const [hours, minutes] = cutoffTime.split(':').map(Number)
const cutoff = new Date(now)
cutoff.setHours(hours, minutes, 0, 0)

console.log('\n⏰ Cutoff Time (11:00 AM):', cutoff.toISOString())
console.log('⏰ Is current time <= cutoff?', now <= cutoff)
console.log('⏰ Expected Status:', now <= cutoff ? 'PENDING' : 'ABSENT')
console.log('\n✅ If current time is before 11:00 AM, status should be PENDING')
console.log('❌ If current time is after 11:00 AM, status should be ABSENT')
