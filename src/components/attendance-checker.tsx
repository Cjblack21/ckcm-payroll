"use client"

import { useEffect } from "react"

/**
 * Global component that runs attendance auto-check every minute
 * Place this in the admin layout to run automatically in the background
 */
export function AttendanceChecker() {
  useEffect(() => {
    const checkAbsentUsers = async () => {
      try {
        const response = await fetch('/api/admin/attendance/auto-check-absent', {
          method: 'POST'
        })
        
        const result = await response.json()
        
        if (result.markedCount > 0) {
          console.log(`✅ Auto-marked ${result.markedCount} users as absent`)
        }
      } catch (error) {
        console.error('❌ Error in attendance auto-check:', error)
      }
    }

    // Run immediately on mount
    checkAbsentUsers()

    // Then run every 1 minute
    const interval = setInterval(checkAbsentUsers, 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // This component renders nothing
  return null
}
