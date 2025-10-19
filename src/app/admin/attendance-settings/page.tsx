"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Clock, Save } from "lucide-react"
import toast from "react-hot-toast"
import { toPhilippinesDateString, calculateWorkingDaysInPhilippines } from "@/lib/timezone"

type AttendanceSettings = {
  attendance_settings_id: string
  timeInStart?: string
  timeInEnd?: string
  noTimeInCutoff: boolean
  timeOutStart?: string
  timeOutEnd?: string
  noTimeOutCutoff: boolean
  periodStart?: string
  periodEnd?: string
  autoMarkAbsent: boolean
  autoMarkLate: boolean
}

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/attendance-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
      } else {
        console.error('Failed to load settings')
        toast.error('Failed to load attendance settings')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Error loading attendance settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    
    try {
      setSaving(true)
      
      // Prepare data for API - exclude ID and other non-editable fields
      const apiData = {
        timeInStart: settings.timeInStart,
        timeInEnd: settings.timeInEnd,
        noTimeInCutoff: false, // Always enforce time-in restrictions
        timeOutStart: settings.timeOutStart,
        timeOutEnd: settings.timeOutEnd,
        noTimeOutCutoff: false, // Always enforce time-out restrictions
        periodStart: settings.periodStart,
        periodEnd: settings.periodEnd,
        autoMarkAbsent: settings.autoMarkAbsent,
        autoMarkLate: settings.autoMarkLate,
      }
      
      console.log('🚀 Sending attendance settings:', apiData)
      
      const res = await fetch('/api/admin/attendance-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(result.message || 'Attendance settings saved successfully!')
        // Reload settings to get updated data
        await loadSettings()
      } else {
        const error = await res.json().catch(() => ({}))
        console.error('❌ API Error Response:', error)
        console.error('❌ Response Status:', res.status, res.statusText)
        
        const errorMessage = error.message || error.error || 'Failed to save settings'
        toast.error(errorMessage)
        
        if (error.details) {
          console.error('📝 Validation details:', error.details)
          toast.error('Validation errors: ' + JSON.stringify(error.details))
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof AttendanceSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
  }

  useEffect(() => {
    loadSettings()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Error</h2>
            <p className="text-muted-foreground">Failed to load attendance settings</p>
            <Button onClick={loadSettings} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Settings</h2>
          <p className="text-muted-foreground">Configure attendance time windows and Time Ins</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Time Windows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Windows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time In Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Time In Window</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeInStart">Time In Start (HH:MM)</Label>
                <Input
                  id="timeInStart"
                  type="time"
                  value={settings.timeInStart || ''}
                  onChange={(e) => updateSetting('timeInStart', e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Start of Time In (no late deduction)
                </p>
              </div>
              <div>
                <Label htmlFor="timeInEnd">Time In End (HH:MM)</Label>
                <Input
                  id="timeInEnd"
                  type="time"
                  value={settings.timeInEnd || ''}
                  onChange={(e) => updateSetting('timeInEnd', e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  End of Time In (late deductions start)
                </p>
              </div>
            </div>
          </div>

          {/* Time Out Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Time Out Window</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeOutStart">Time Out Start (HH:MM)</Label>
                <Input
                  id="timeOutStart"
                  type="time"
                  value={settings.timeOutStart || ''}
                  onChange={(e) => updateSetting('timeOutStart', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="timeOutEnd">Time Out End (HH:MM)</Label>
                <Input
                  id="timeOutEnd"
                  type="time"
                  value={settings.timeOutEnd || ''}
                  onChange={(e) => updateSetting('timeOutEnd', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automated Marking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automated Status Marking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure automatic marking of attendance status based on time windows.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="autoMarkAbsent"
                checked={settings.autoMarkAbsent || false}
                onCheckedChange={(checked) => updateSetting('autoMarkAbsent', checked)}
              />
              <Label htmlFor="autoMarkAbsent">Automatically mark as ABSENT</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Personnel who don't time in or time out will be automatically marked as absent
            </p>

            <div className="flex items-center space-x-2">
              <Switch
                id="autoMarkLate"
                checked={settings.autoMarkLate || false}
                onCheckedChange={(checked) => updateSetting('autoMarkLate', checked)}
              />
              <Label htmlFor="autoMarkLate">Automatically mark as LATE</Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Personnel who time in after the grace period will be automatically marked as late
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
