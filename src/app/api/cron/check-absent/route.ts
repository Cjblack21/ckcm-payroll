import { NextResponse } from 'next/server'

/**
 * Cron job endpoint to automatically check and mark absent users
 * This should be called every minute by a cron service (e.g., Vercel Cron, external cron job)
 */
export async function GET() {
  try {
    // Call the auto-check-absent API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/attendance/auto-check-absent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    
    console.log('✅ Cron job executed:', result.message)
    
    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      result
    })
  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({
      success: false,
      error: 'Cron job failed'
    }, { status: 500 })
  }
}

// Allow POST as well for manual triggering
export async function POST() {
  return GET()
}
