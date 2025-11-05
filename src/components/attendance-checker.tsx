"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"

/**
 * Global component that runs attendance auto-check every minute
 * Place this in the admin layout to run automatically in the background
 * Only runs for authenticated admin users
 */
export function AttendanceChecker() {
  const { data: session, status } = useSession()
  
  useEffect(() => {
    // Only run for authenticated admin users
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") {
      return
    }
    
    const checkAbsentUsers = async () => {
      try {
        const response = await fetch('/api/admin/attendance/auto-check-absent', {
          method: 'POST'
        })
        
        if (!response.ok) {
          // Silently fail for non-admin users or auth issues
          return
        }
        
        const result = await response.json()
        
        if (result.markedCount > 0) {
          console.log(`✅ Auto-marked ${result.markedCount} users as absent`)
        }
      } catch (error) {
        // Silently handle network errors to avoid console spam
        // Only log if it's not a fetch/network error
        if (error instanceof Error && !error.message.includes('fetch')) {
          console.error('❌ Error in attendance auto-check:', error)
        }
      }
    }

    // Run immediately on mount
    checkAbsentUsers()

    // Then run every 1 minute
    const interval = setInterval(checkAbsentUsers, 60 * 1000)

    return () => clearInterval(interval)
  }, [session, status])

  // This component renders nothing
  return null
}
