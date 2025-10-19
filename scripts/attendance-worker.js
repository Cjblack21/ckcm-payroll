/**
 * Background worker to automatically check and mark absent users
 * Run this with: node scripts/attendance-worker.js
 */

const CHECK_INTERVAL = 60000 // 1 minute

async function checkAbsentUsers() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/attendance/auto-check-absent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    const timestamp = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    console.log(`[${timestamp}] ${result.message}`)
    
    if (result.markedCount > 0) {
      console.log(`✅ Marked ${result.markedCount} users as absent`)
    }
  } catch (error) {
    console.error('❌ Error checking absent users:', error.message)
  }
}

// Run immediately
console.log('🚀 Attendance worker started - checking every minute...')
checkAbsentUsers()

// Then run every minute
setInterval(checkAbsentUsers, CHECK_INTERVAL)
