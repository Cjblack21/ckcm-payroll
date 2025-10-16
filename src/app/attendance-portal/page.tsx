"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatInTimeZone } from "date-fns-tz"
import { Badge } from "@/components/ui/badge"
import { Clock, ArrowRightCircle, LogIn, LogOut, AlertCircle } from "lucide-react"

export default function AttendancePortalPage() {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date>(new Date())
  const [schoolId, setSchoolId] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null)
  const [showAlreadyTimedInModal, setShowAlreadyTimedInModal] = useState(false)
  const [leaveStatus, setLeaveStatus] = useState<any>(null)

  // Use a configurable base path so the app can be deployed under e.g. /attendance-portal
  const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-dismiss modal when time-out window opens
  useEffect(() => {
    if (showAlreadyTimedInModal && settings) {
      const timeOutStart = settings.timeOutStart
      const currentTime = hhmmNow()
      
      if (timeOutStart && currentTime >= timeOutStart) {
        setShowAlreadyTimedInModal(false)
      }
    }
  }, [now, showAlreadyTimedInModal, settings])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${BASE_PATH}/api/attendance/settings`)
        const data = await res.json()
        setSettings(data.settings || null)
      } catch (e) {}
    })()
  }, [])

  const manilaTime = useMemo(() => formatInTimeZone(now, "Asia/Manila", "MMM dd, yyyy - h:mm:ss a"), [now])

  function hhmmNow(): string {
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  function within(start?: string | null, end?: string | null): boolean | null {
    if (!start || !end) return null
    const cur = hhmmNow()
    
    // Convert to minutes for proper comparison
    const currentMinutes = parseInt(cur.split(':')[0]) * 60 + parseInt(cur.split(':')[1])
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1])
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1])
    
    // Check if this is an overnight window (start > end)
    const isOvernightWindow = startMinutes > endMinutes
    
    if (isOvernightWindow) {
      // Overnight window: valid if current >= start OR current <= end
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes
    } else {
      // Normal window: valid if current >= start AND current <= end
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    }
  }

  const checkAttendanceStatus = async (userId: string) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/attendance/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users_id: userId })
      })
      const data = await res.json()
      if (res.ok) {
        setAttendanceStatus(data)
        return data
      }
      return null
    } catch (e) {
      return null
    }
  }

  const onPunch = async () => {
    setSaving(true)
    setMessage(null)
    setLeaveStatus(null)
    
    try {
      // Use API route for attendance portal (no authentication required)
      const response = await fetch(`${BASE_PATH}/api/attendance/punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users_id: schoolId })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        // Check if error is due to leave
        if (result.onLeave) {
          setLeaveStatus(result.leaveDetails)
        }
        setMessage(result.error || 'Failed to record attendance')
      } else {
        // Clear the form and show brief success message
        setSchoolId("")
        setMessage("Attendance recorded successfully!")
        
        // Show late deduction if applicable
        if (result.lateDeduction) {
          setMessage(`Time-in recorded. Late arrival deduction: ₱${result.lateDeduction.amount.toFixed(2)} (${result.lateDeduction.minutes} minutes late)`)
        }
        
        // Show early timeout deduction if applicable
        if (result.earlyTimeoutDeduction) {
          setMessage(`Time-out recorded. Early departure deduction: ₱${result.earlyTimeoutDeduction.amount.toFixed(2)} (${result.earlyTimeoutDeduction.minutes} minutes early)`)
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setMessage(null)
        }, 5000)
      }
    } catch (e) {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  // Determine if user can punch in/out based on current time and settings
  const canPunch = useMemo(() => {
    if (!settings) return true // Allow if no settings
    
    const currentTime = hhmmNow()
    const isTimeInWindow = within(settings.timeInStart, settings.timeInEnd)
    const isTimeOutWindow = within(settings.timeOutStart, settings.timeOutEnd)
    
    // Always allow punching - let the backend API handle all validation
    // The backend will correctly mark late time-ins as LATE status
    // The backend will block time-ins only if explicitly configured to do so
    return true
  }, [settings, now])

  // Get current punch action type
  const getPunchAction = () => {
    if (!schoolId.trim()) return 'Submit Attendance'
    
    // This would need to check actual user status, but for now show generic
    if (inWindow) return 'Time In'
    if (outWindow) return 'Time Out'
    return 'Submit Attendance'
  }

  function formatHHmmTo12(hhmm?: string | null) {
    if (!hhmm) return '—'
    const [h, m] = hhmm.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return '—'
    const hour12 = ((h + 11) % 12) + 1
    const ampm = h >= 12 ? 'PM' : 'AM'
    const mm = m.toString().padStart(2, '0')
    return `${hour12}:${mm} ${ampm}`
  }

  const inWindow = within(settings?.timeInStart, settings?.timeInEnd)
  const outWindow = within(settings?.timeOutStart, settings?.timeOutEnd)

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden p-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Full Screen Content - Centered */}
      <div className="w-full max-w-3xl relative z-10 space-y-4">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl shadow-2xl flex items-center justify-center">
            <Clock className="h-12 w-12 text-white" />
          </div>
        </div>
        
        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Attendance Portal
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium">
            Submit your time in/out using your School ID
          </p>
        </div>
        
        {/* Current Time Display */}
        <div className="text-center py-4">
          <div className="text-sm sm:text-base text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Current Time - Maranding, Lala</div>
          <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent" suppressHydrationWarning>
            {mounted ? manilaTime : ''}
          </div>
        </div>

        {/* User ID Input */}
        <div className="space-y-4 py-3">
          <label className="text-2xl sm:text-3xl font-bold text-center block flex items-center justify-center gap-3">
            <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            School ID
          </label>
          <Input 
            placeholder="Enter your School ID" 
            value={schoolId} 
            onChange={(e) => setSchoolId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onPunch()}
            style={{ fontSize: '2rem', lineHeight: '1.2' }}
            className="h-20 sm:h-22 text-center font-bold bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-4 border-orange-300 dark:border-orange-700 focus:border-orange-500 dark:focus:border-orange-500 transition-all shadow-xl rounded-2xl placeholder:text-3xl"
          />
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full h-18 sm:h-20 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-2xl sm:text-3xl shadow-2xl hover:shadow-3xl transition-all duration-200 rounded-2xl"
          disabled={saving || !schoolId.trim() || !canPunch} 
          onClick={onPunch}
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              {getPunchAction()}
              <ArrowRightCircle className="h-7 w-7 ml-3" />
            </>
          )}
        </Button>
          
        {/* Time Windows - Compact */}
        {settings && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-3 rounded-xl border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <LogIn className="h-4 w-4 text-green-600" />
                <span className="text-sm font-bold text-green-900 dark:text-green-100">Time In</span>
              </div>
              <div className="text-xs font-semibold text-green-700 dark:text-green-300">
                {formatHHmmTo12(settings.timeInStart)} — {formatHHmmTo12(settings.timeInEnd)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-3 rounded-xl border-2 border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <LogOut className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-bold text-orange-900 dark:text-orange-100">Time Out</span>
              </div>
              <div className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                {formatHHmmTo12(settings.timeOutStart)} — {formatHHmmTo12(settings.timeOutEnd)}
              </div>
            </div>
          </div>
        )}
        
        {/* Current Status Badge */}
        {settings && (inWindow !== null || outWindow !== null) && (
          <div className="text-center">
            <Badge 
              variant="outline"
              className={`text-xs px-3 py-1.5 font-medium border-2 ${
                inWindow 
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700' 
                  : outWindow 
                  ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700' 
                  : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700'
              }`}
            >
              {inWindow ? '🟢 Within time-in window' : outWindow ? '🟠 Within time-out window' : '⚪ Outside windows'}
            </Badge>
          </div>
        )}

          {/* Message Display */}
          {message && !leaveStatus && (
            <div className={`text-center text-sm sm:text-base p-3 rounded-xl font-medium border-2 shadow-sm ${
              message.includes('successfully') 
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700' 
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
            }`}>
              <div className="flex items-center justify-center gap-2">
                {message.includes('successfully') ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{message}</span>
              </div>
            </div>
          )}
          
          {leaveStatus && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-3 shadow-sm text-center">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                You are on approved leave ({new Date(leaveStatus.startDate).toLocaleDateString()} - {new Date(leaveStatus.endDate).toLocaleDateString()})
              </div>
            </div>
          )}
      </div>

      {/* Already Timed In Modal */}
      <Dialog open={showAlreadyTimedInModal} onOpenChange={setShowAlreadyTimedInModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Already Timed In
            </DialogTitle>
            <DialogDescription>
              You have already timed in today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {attendanceStatus && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time In:</span>
                    <span className="font-medium">
                      {attendanceStatus.timeIn ? 
                        formatInTimeZone(new Date(attendanceStatus.timeIn), 'Asia/Manila', 'h:mm a') : 
                        '—'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">
                      {attendanceStatus.status_type?.toLowerCase() || 'Present'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              You can only time out during the designated time-out window. 
              Please wait for the time-out period to record your departure.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowAlreadyTimedInModal(false)}>
                Understood
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


