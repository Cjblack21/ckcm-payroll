"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, KeyRound, Eye, EyeOff, Camera, Settings, AlertTriangle } from "lucide-react"
import { toast } from "react-hot-toast"

type ProfileData = {
  user: {
    name: string
    email: string
    avatar?: string
  }
}

export default function AdminProfile() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "profile"
  
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Settings state
  const [settings, setSettings] = useState({
    theme: "light",
    language: "en",
    emailNotifications: true,
    payrollNotifications: true,
    systemNotifications: true,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [resettingPayroll, setResettingPayroll] = useState(false)
  const [resettingAttendance, setResettingAttendance] = useState(false)
  const [resettingPositions, setResettingPositions] = useState(false)
  const [resettingCountdown, setResettingCountdown] = useState(false)
  const [resettingAll, setResettingAll] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetType, setResetType] = useState<'payroll' | 'attendance' | 'positions' | 'countdown' | 'all' | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  useEffect(() => {
    async function loadProfileData() {
      try {
        const res = await fetch('/api/admin/profile')
        if (res.ok) {
          const profileData = await res.json()
          setData(profileData)
        } else {
          console.error('Failed to load profile data')
        }
      } catch (error) {
        console.error('Error loading profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings')
        if (res.ok) {
          const data = await res.json()
          setSettings({
            theme: data.settings.theme,
            language: data.settings.language,
            emailNotifications: data.settings.emailNotifications,
            payrollNotifications: data.settings.payrollNotifications,
            systemNotifications: data.settings.systemNotifications,
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }

    loadProfileData()
    loadSettings()
  }, [])

  async function handleChangePassword() {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }

    try {
      setChangingPassword(true)
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to change password")
      }

      toast.success("Password changed successfully!")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error) {
      console.error("Error changing password:", error)
      toast.error(error instanceof Error ? error.message : "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  async function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/admin/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload photo')
      }

      toast.success('Profile picture updated successfully!')
      // Refresh profile data
      const res = await fetch('/api/admin/profile')
      if (res.ok) {
        const profileData = await res.json()
        setData(profileData)
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleRemovePhoto() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return

    try {
      setUploadingPhoto(true)
      const response = await fetch('/api/admin/remove-avatar', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove photo')
      }

      toast.success('Profile picture removed successfully!')
      // Refresh profile data
      const res = await fetch('/api/admin/profile')
      if (res.ok) {
        const profileData = await res.json()
        setData(profileData)
      }
    } catch (error) {
      console.error('Error removing photo:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSaveSettings() {
    try {
      setSavingSettings(true)
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }

      toast.success('Settings saved successfully!')
      
      // Apply theme if changed
      if (settings.theme !== 'light') {
        document.documentElement.classList.toggle('dark', settings.theme === 'dark')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  function handleResetPayroll() {
    setResetType('payroll')
    setShowResetModal(true)
  }

  function handleResetAttendance() {
    setResetType('attendance')
    setShowResetModal(true)
  }

  function handleResetPositions() {
    setResetType('positions')
    setShowResetModal(true)
  }

  function handleResetCountdown() {
    setResetType('countdown')
    setShowResetModal(true)
  }

  function handleResetAll() {
    setResetType('all')
    setShowResetModal(true)
  }

  async function confirmReset() {
    if (!resetPassword) {
      toast.error('Please enter your password')
      return
    }

    try {
      if (resetType === 'payroll') {
        setResettingPayroll(true)
      } else if (resetType === 'attendance') {
        setResettingAttendance(true)
      } else if (resetType === 'positions') {
        setResettingPositions(true)
      } else if (resetType === 'countdown') {
        setResettingCountdown(true)
      } else {
        setResettingAll(true)
      }

      // Verify password first
      const verifyResponse = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Incorrect password')
      }

      // Proceed with reset
      const response = await fetch(`/api/admin/reset/${resetType}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to reset ${resetType}`)
      }

      const typeLabel = resetType === 'payroll' ? 'Payroll' : resetType === 'attendance' ? 'Attendance' : resetType === 'positions' ? 'Positions' : resetType === 'countdown' ? 'Payroll Release Countdown' : 'All'
      
      // Show detailed feedback for attendance reset
      if (resetType === 'attendance' && result.deletedCount) {
        toast.success(`${typeLabel} reset complete! Deleted ${result.deletedCount.attendance} attendance records and ${result.deletedCount.deductions} related deductions.`)
      } else {
        toast.success(`${typeLabel} data has been reset successfully!`)
      }
      setShowResetModal(false)
      setResetPassword('')
      setResetType(null)
    } catch (error) {
      console.error(`Error resetting ${resetType}:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to reset ${resetType}`)
    } finally {
      setResettingPayroll(false)
      setResettingAttendance(false)
      setResettingPositions(false)
      setResettingCountdown(false)
      setResettingAll(false)
    }
  }

  function cancelReset() {
    setShowResetModal(false)
    setResetPassword('')
    setResetType(null)
  }

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

  if (!data) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Error</h2>
            <p className="text-muted-foreground">Failed to load profile data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-gray-600">Manage your profile and account settings</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Your profile photo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={data.user.avatar} alt={data.user.name} />
                  <AvatarFallback className="text-2xl">
                    {data.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload a new profile picture. Recommended size: 400x400px (Max: 5MB)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                    </Button>
                    {data.user.avatar && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleRemovePhoto}
                        disabled={uploadingPhoto}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                <div className="text-lg font-semibold">{data.user.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email Address</div>
                <div className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {data.user.email}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Application Settings
              </CardTitle>
              <CardDescription>
                Configure your preferences and application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Settings */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Appearance</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Theme</div>
                    <div className="text-sm text-muted-foreground">Choose your display theme</div>
                  </div>
                  <select 
                    className="border rounded-md px-3 py-2"
                    value={settings.theme}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Notifications</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">Receive email updates about your account</div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4" 
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Payroll Notifications</div>
                      <div className="text-sm text-muted-foreground">Get notified about payroll updates</div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4" 
                      checked={settings.payrollNotifications}
                      onChange={(e) => setSettings({ ...settings, payrollNotifications: e.target.checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">System Updates</div>
                      <div className="text-sm text-muted-foreground">Receive notifications about system changes</div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4" 
                      checked={settings.systemNotifications}
                      onChange={(e) => setSettings({ ...settings, systemNotifications: e.target.checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Language & Region */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Language & Region</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Language</div>
                      <div className="text-sm text-muted-foreground">Select your preferred language</div>
                    </div>
                    <select 
                      className="border rounded-md px-3 py-2"
                      value={settings.language}
                      onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    >
                      <option value="en">English</option>
                      <option value="fil">Filipino</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Time Zone</div>
                      <div className="text-sm text-muted-foreground">Asia/Manila (GMT+8)</div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full md:w-auto"
                onClick={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions - use with extreme caution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reset ALL - Most Dangerous */}
              <div className="p-4 border-2 border-red-500 rounded-lg bg-red-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-red-950 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Reset ALL Data
                    </div>
                    <div className="text-sm text-red-900 mt-1 font-semibold">
                      DANGER: This will permanently delete ALL payroll, attendance, deductions, loans, position data, and reset the payroll release countdown.
                      The entire system will be reset to zero. This action CANNOT be undone!
                    </div>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleResetAll}
                    disabled={resettingAll}
                    className="shrink-0 bg-red-700 hover:bg-red-800"
                  >
                    {resettingAll ? "Resetting..." : "Reset ALL"}
                  </Button>
                </div>
              </div>

              <div className="border-t border-red-200 my-4"></div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-red-900">Reset Payroll Data</div>
                    <div className="text-sm text-red-700 mt-1">
                      This will permanently delete all payroll entries, including released and archived payrolls.
                      This action cannot be undone.
                    </div>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleResetPayroll}
                    disabled={resettingPayroll}
                    className="shrink-0"
                  >
                    {resettingPayroll ? "Resetting..." : "Reset Payroll"}
                  </Button>
                </div>
              </div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-red-900">Reset Attendance Data</div>
                    <div className="text-sm text-red-700 mt-1">
                      This will permanently delete all attendance records for all employees.
                      This action cannot be undone.
                    </div>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleResetAttendance}
                    disabled={resettingAttendance}
                    className="shrink-0"
                  >
                    {resettingAttendance ? "Resetting..." : "Reset Attendance"}
                  </Button>
                </div>
              </div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-red-900">Reset Positions (Personnel Types)</div>
                    <div className="text-sm text-red-700 mt-1">
                      This will permanently delete all position/personnel type data and reset salaries to zero.
                      This action cannot be undone.
                    </div>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleResetPositions}
                    disabled={resettingPositions}
                    className="shrink-0"
                  >
                    {resettingPositions ? "Resetting..." : "Reset Positions"}
                  </Button>
                </div>
              </div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-red-900">Reset Payroll Release Countdown</div>
                    <div className="text-sm text-red-700 mt-1">
                      This will reset the payroll release countdown to zero by clearing the period dates.
                      This action cannot be undone.
                    </div>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleResetCountdown}
                    disabled={resettingCountdown}
                    className="shrink-0"
                  >
                    {resettingCountdown ? "Resetting..." : "Reset Countdown"}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                ⚠️ Warning: These actions will require multiple confirmations and cannot be reversed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={changingPassword}
                className="w-full md:w-auto"
              >
                {changingPassword ? "Changing Password..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Reset {resetType === 'payroll' ? 'Payroll' : resetType === 'attendance' ? 'Attendance' : resetType === 'positions' ? 'Positions' : resetType === 'countdown' ? 'Countdown' : 'ALL'} Data
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action requires your password</p>
              </div>
            </div>

            <div className="mb-6">
              {resetType === 'all' ? (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                  <p className="text-sm font-bold text-red-900 dark:text-red-200 mb-2">
                    ⚠️ EXTREME DANGER - You are about to reset EVERYTHING:
                  </p>
                  <ul className="text-xs text-red-800 dark:text-red-300 space-y-1 ml-4 list-disc">
                    <li>All payroll entries and deductions</li>
                    <li>All attendance records</li>
                    <li>All position/personnel type data</li>
                    <li>All loans and loan balances</li>
                    <li>Payroll release countdown (period dates)</li>
                  </ul>
                  <p className="text-xs font-semibold text-red-900 dark:text-red-200 mt-2">
                    The entire system will be reset to zero state!
                  </p>
                </div>
              ) : null}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to reset {resetType === 'payroll' ? 'payroll' : resetType === 'attendance' ? 'attendance' : resetType === 'positions' ? 'positions' : resetType === 'countdown' ? 'payroll release countdown' : 'EVERYTHING'}?
                This will permanently {resetType === 'countdown' ? 'clear the period dates and reset the countdown to zero' : `delete all ${resetType === 'payroll' ? 'payroll entries' : resetType === 'attendance' ? 'attendance records' : resetType === 'positions' ? 'position/personnel type data' : 'system data'}`} and cannot be undone.
              </p>

              <div className="space-y-2">
                <Label htmlFor="resetPassword">Enter Your Password to Confirm</Label>
                <Input
                  id="resetPassword"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Your admin password"
                  onKeyDown={(e) => e.key === 'Enter' && confirmReset()}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={cancelReset}
                disabled={resettingPayroll || resettingAttendance || resettingPositions || resettingCountdown || resettingAll}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmReset}
                disabled={resettingPayroll || resettingAttendance || resettingPositions || resettingCountdown || resettingAll || !resetPassword}
              >
                {resettingPayroll || resettingAttendance || resettingPositions || resettingCountdown || resettingAll ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
