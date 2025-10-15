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
    
    try {
      // Use API route for attendance portal (no authentication required)
      const response = await fetch(`${BASE_PATH}/api/attendance/punch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users_id: schoolId })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
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
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">Attendance Portal</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Submit your time in/out using your School ID
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Time Display */}
          <div className="text-center">
            <div className="text-2xl font-mono font-semibold text-primary" suppressHydrationWarning>
              {mounted ? manilaTime : ''}
            </div>
          </div>

          {/* User ID Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">School ID</label>
            <Input 
              placeholder="Enter your School ID" 
              value={schoolId} 
              onChange={(e) => setSchoolId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onPunch()}
            />
          </div>

          {/* Submit Button */}
          <Button 
            className="w-full" 
            disabled={saving || !schoolId.trim() || !canPunch} 
            onClick={onPunch}
          >
            {saving ? 'Processing...' : getPunchAction()}
            {!saving && <ArrowRightCircle className="h-4 w-4 ml-2" />}
          </Button>
          
          {/* Info message when outside preferred windows */}
          {settings && (() => {
            const isTimeInWindow = within(settings.timeInStart, settings.timeInEnd)
            const isTimeOutWindow = within(settings.timeOutStart, settings.timeOutEnd)
            
            if (!isTimeInWindow && !isTimeOutWindow) {
              return (
                <div className="text-center text-sm p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Outside preferred time windows. Late time-ins will be marked as "Late" status.
                </div>
              )
            }
            return null
          })()}

          {/* Time Windows */}
          {settings && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-sm font-medium text-muted-foreground">Attendance Windows</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <LogIn className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Time In</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatHHmmTo12(settings.timeInStart)} — {formatHHmmTo12(settings.timeInEnd)}
                    {(() => {
                      const startMinutes = parseInt(settings.timeInStart.split(':')[0]) * 60 + parseInt(settings.timeInStart.split(':')[1])
                      const endMinutes = parseInt(settings.timeInEnd.split(':')[0]) * 60 + parseInt(settings.timeInEnd.split(':')[1])
                      return startMinutes > endMinutes ? (
                        <span className="ml-1 text-xs text-amber-600">(overnight)</span>
                      ) : null
                    })()}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <LogOut className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Time Out</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatHHmmTo12(settings.timeOutStart)} — {formatHHmmTo12(settings.timeOutEnd)}
                  </div>
                </div>
              </div>
              
              {/* Current Status */}
              {(inWindow !== null || outWindow !== null) && (
                <div className="text-center">
                  <Badge 
                    variant={inWindow ? "default" : outWindow ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {inWindow ? 'Within time-in window' : outWindow ? 'Within time-out window' : 'Outside allowed windows'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`text-center text-sm p-3 rounded-lg ${
              message.includes('successfully') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
              {message}
            </div>
          )}
        </CardContent>
      </Card>

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


