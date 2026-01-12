"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatInTimeZone } from "date-fns-tz"
import { Badge } from "@/components/ui/badge"
import { Clock, ArrowRightCircle, LogIn, LogOut, AlertCircle, Sun, Moon, Monitor } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Types for settings and responses to satisfy linting without using 'any'
type AttendanceSettings = {
  timeInStart?: string | null
  timeInEnd?: string | null
  timeOutStart?: string | null
  timeOutEnd?: string | null
}

type AttendanceStatusResp = {
  status?: string
  message?: string
  timeIn?: string | null
  timeOut?: string | null
  status_type?: string | null
}

type LeaveDetails = {
  type: string
  startDate: string
  endDate: string
}

export default function AttendancePortalPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date>(new Date())
  const [schoolId, setSchoolId] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [settings, setSettings] = useState<AttendanceSettings | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusResp | null>(null)
  const [showAlreadyTimedInModal, setShowAlreadyTimedInModal] = useState(false)
  const [leaveStatus, setLeaveStatus] = useState<LeaveDetails | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successModalMessage, setSuccessModalMessage] = useState('')
  const [successModalType, setSuccessModalType] = useState<'time-in' | 'time-out'>('time-in')
  const [userAttendanceStatus, setUserAttendanceStatus] = useState<{ hasTimedIn: boolean, hasTimedOut: boolean } | null>(null)

  // Auto-refresh interval in milliseconds (default: 30 seconds)
  const AUTO_REFRESH_INTERVAL = 30000

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

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${BASE_PATH}/api/attendance/settings`)
        const data = await res.json()
        setSettings((data.settings || null) as AttendanceSettings | null)
      } catch (e) { }
    }

    fetchSettings()
  }, [])

  // Auto-refresh settings periodically
  useEffect(() => {
    const refreshSettings = async () => {
      try {
        const res = await fetch(`${BASE_PATH}/api/attendance/settings`)
        const data = await res.json()
        setSettings((data.settings || null) as AttendanceSettings | null)
      } catch (e) { }
    }

    const interval = setInterval(refreshSettings, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [BASE_PATH, AUTO_REFRESH_INTERVAL])

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

  const checkAttendanceStatus = async (userId: string): Promise<AttendanceStatusResp | null> => {
    try {
      const res = await fetch(`${BASE_PATH}/api/attendance/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users_id: userId })
      })
      const data = (await res.json()) as AttendanceStatusResp
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
      const payload = schoolId.trim().includes('@') ? { email: schoolId.trim() } : { users_id: schoolId.trim() }
      const response = await fetch(`${BASE_PATH}/api/attendance/punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        // Check if error is due to leave
        if (result.onLeave) {
          setLeaveStatus(result.leaveDetails)
        }
        setMessage(result.error || 'Failed to record attendance')
      } else {
        // Determine modal type based on response
        const wasTimeIn = !result.record?.timeOut || result.lateDeduction
        const wasTimeOut = result.record?.timeOut || result.earlyTimeoutDeduction

        // Clear the form
        setSchoolId("")
        setUserAttendanceStatus(null) // Reset status

        // Determine modal type and message
        let modalMessage = 'Attendance recorded successfully!'
        let modalType: 'time-in' | 'time-out' = wasTimeOut ? 'time-out' : 'time-in'

        // Show late message if applicable
        if (result.lateDeduction) {
          modalType = 'time-in'
          const totalMinutes = Math.floor(result.lateDeduction.minutes / 60)
          const hours = Math.floor(totalMinutes / 60)
          const minutes = totalMinutes % 60

          let timeText = ''
          if (hours > 0 && minutes > 0) {
            timeText = `${hours} ${hours === 1 ? 'hour' : 'hours'} and ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
          } else if (hours > 0) {
            timeText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`
          } else {
            timeText = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
          }

          const currentTime = formatInTimeZone(new Date(), "Asia/Manila", "h:mm a")
          modalMessage = `You timed in at ${currentTime}\nYou are ${timeText} late`
        } else if (wasTimeIn) {
          // On-time time-in
          const currentTime = formatInTimeZone(new Date(), "Asia/Manila", "h:mm a")
          modalMessage = `You timed in at ${currentTime}\nOn time! Great job! ✨`
        }

        // Show early timeout message if applicable
        if (result.earlyTimeoutDeduction) {
          modalType = 'time-out'
          const totalMinutes = result.earlyTimeoutDeduction.minutes
          const hours = Math.floor(totalMinutes / 60)
          const minutes = totalMinutes % 60

          let timeText = ''
          if (hours > 0 && minutes > 0) {
            timeText = `${hours} ${hours === 1 ? 'hour' : 'hours'} and ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
          } else if (hours > 0) {
            timeText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`
          } else {
            timeText = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
          }

          const currentTime = formatInTimeZone(new Date(), "Asia/Manila", "h:mm a")
          modalMessage = `You timed out at ${currentTime}\nYou left ${timeText} early`
        } else if (wasTimeOut && !result.earlyTimeoutDeduction) {
          // On-time time-out
          const currentTime = formatInTimeZone(new Date(), "Asia/Manila", "h:mm a")
          modalMessage = `You timed out at ${currentTime}\nThank you for your hard work today! 💪`
        }

        // Show success modal
        setSuccessModalType(modalType)
        setSuccessModalMessage(modalMessage)
        setShowSuccessModal(true)

        // Auto-dismiss modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false)
        }, 3000)
      }
    } catch (e) {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  // Determine if user can punch in/out based on cutoff only
  const canPunch = useMemo(() => {
    if (!settings) return true

    const currentTime = hhmmNow()

    // Block only after cutoff (timeOutEnd)
    if (settings.timeOutEnd) {
      const [ch, cm] = currentTime.split(':').map(Number)
      const [eh, em] = settings.timeOutEnd.split(':').map(Number)
      const cur = ch * 60 + cm
      const end = eh * 60 + em
      const start = settings.timeOutStart ? (parseInt(settings.timeOutStart.split(':')[0]) * 60 + parseInt(settings.timeOutStart.split(':')[1])) : null
      let afterEnd = false
      if (start !== null && start > end) {
        // Overnight cutoff
        afterEnd = cur > end && cur < start
      } else {
        // Normal same-day cutoff
        afterEnd = cur > end
      }
      if (afterEnd) return false
    }

    // Otherwise allow (late/early will have deductions)
    return true
  }, [settings, now])

  // Status check disabled - button now always shows "Submit Attendance"
  // The API automatically determines whether to time in or time out
  // useEffect(() => {
  //   ... status check code removed ...
  // }, [schoolId, BASE_PATH])

  // Get current punch action type
  const getPunchAction = () => {
    // Always show "Submit Attendance" - the API will determine the correct action
    return schoolId.trim() ? 'Submit Attendance' : 'Submit Attendance'
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
    <div className="relative min-h-screen overflow-hidden bg-[#0a1628]">
      {/* Theme Toggle */}
      {mounted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-6 right-6 z-50 h-10 w-10 rounded-full bg-slate-800/90 hover:bg-slate-700 transition-all duration-300 border border-slate-700"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-slate-400" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-slate-800/95 backdrop-blur-md border-slate-700">
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Moon className="h-4 w-4 text-slate-400" />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer gap-2 text-slate-300"
            >
              <Monitor className="h-4 w-4 text-slate-500" />
              <span>System</span>
              {theme === "system" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Main Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="flex flex-col items-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <Image
                src="/brgy-logo.png"
                alt="Barangay Logo"
                width={224}
                height={224}
                className="h-56 w-56 transform translate-y-12"
                unoptimized
              />
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-white">
                POBLACION Attendance
              </h1>
              <p className="text-sm text-slate-400">
                Submit your time in/out using your School ID or Email
              </p>
            </div>

            {/* Current Time Display */}
            <div className="w-full bg-[#0f1f3a] rounded-2xl p-6 border border-slate-800">
              <div className="text-center space-y-2">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Current Time - Maranding, Lala</div>
                <div className="text-3xl font-mono font-bold text-white" suppressHydrationWarning>
                  {mounted ? manilaTime : ''}
                </div>
              </div>
            </div>

            {/* Main Card */}
            <div className="w-full bg-[#0f1f3a] rounded-2xl p-8 border border-slate-800 space-y-6">
              {/* User ID Input */}
              <div className="space-y-3">
                <label className="text-lg font-semibold text-white block">
                  School ID or Email
                </label>
                <Input
                  placeholder="Enter your School ID or Email"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && canPunch && !saving && onPunch()}
                  className="h-16 text-center text-2xl font-medium bg-slate-800/50 border-slate-700 focus:border-orange-500 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg transition-all duration-200"
                disabled={saving || !schoolId.trim() || !canPunch || (userAttendanceStatus?.hasTimedOut === true)}
                onClick={onPunch}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {getPunchAction()}
                    <ArrowRightCircle className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>

              {/* Time Windows */}
              {settings && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <LogIn className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-semibold text-white">Time In</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatHHmmTo12(settings.timeInStart)} — {formatHHmmTo12(settings.timeInEnd)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      <LogOut className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-semibold text-white">Time Out</span>
                    </div>
                    <div className="text-xs text-slate-400">
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
                    className={`text-xs px-3 py-1.5 font-medium ${inWindow
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : outWindow
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        : canPunch
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          : 'bg-slate-700 text-slate-400 border-slate-600'
                      }`}
                  >
                    {inWindow ? '🟢 On-time window' : outWindow ? '🟠 Time-out window' : canPunch ? '⚠️ Late/Early (deductions apply)' : '⚪ Past cutoff (attendance closed)'}
                  </Badge>
                </div>
              )}

              {/* Message Display */}
              {message && !leaveStatus && (
                <div className={`text-center text-sm p-3 rounded-lg font-medium ${message.includes('successfully')
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
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
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                  <div className="text-sm font-medium text-blue-400">
                    You are on approved leave ({new Date(leaveStatus.startDate).toLocaleDateString()} - {new Date(leaveStatus.endDate).toLocaleDateString()})
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500">
              © 2026 PMS. All rights reserved.
            </p>
          </div>
        </div>
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

      {/* Success Modal - Auto-dismiss after 3 seconds */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md border-2 border-green-300 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              {successModalType === 'time-in' ? (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <LogIn className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <LogOut className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              )}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {successModalType === 'time-in' ? 'Time In Recorded' : 'Time Out Recorded'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center">
              <div className="text-5xl mb-4">
                {successModalMessage.includes('late') ? '⏰' :
                  successModalMessage.includes('early') ? '⚠️' : '✅'}
              </div>
              <p className="text-xl font-semibold text-foreground mb-2 whitespace-pre-line">
                {successModalMessage}
              </p>
              {(successModalMessage.includes('late') || successModalMessage.includes('early')) && (
                <p className="text-sm text-muted-foreground">
                  Deductions will be applied to your salary
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


