"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Building, DollarSign, KeyRound, Eye, EyeOff, Camera } from "lucide-react"
import { toast } from "react-hot-toast"

type ProfileData = {
  user: {
    name: string
    email: string
    position: string
    basicSalary: number
    biweeklySalary: number
    avatar?: string
  }
}

export default function PersonnelProfile() {
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

  useEffect(() => {
    async function loadProfileData() {
      try {
        const res = await fetch('/api/personnel/dashboard')
        if (res.ok) {
          const dashboardData = await res.json()
          setData(dashboardData)
        } else {
          console.error('Failed to load profile data')
        }
      } catch (error) {
        console.error('Error loading profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfileData()
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
      const response = await fetch("/api/personnel/change-password", {
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

      const response = await fetch('/api/personnel/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload photo')
      }

      toast.success('Profile picture updated successfully!')
      // Refresh profile data
      const res = await fetch('/api/personnel/dashboard')
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
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
      const response = await fetch('/api/personnel/remove-avatar', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove photo')
      }

      toast.success('Profile picture removed successfully!')
      // Refresh profile data
      const res = await fetch('/api/personnel/dashboard')
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
      }
    } catch (error) {
      console.error('Error removing photo:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove photo')
    } finally {
      setUploadingPhoto(false)
    }
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

          <div className="grid gap-4 md:grid-cols-2">
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

            {/* Employment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Employment Information
                </CardTitle>
                <CardDescription>Your employment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Position</div>
                  <div className="text-lg font-semibold">{data.user.position}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Monthly Salary</div>
                  <div className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    ₱{data.user.basicSalary?.toLocaleString() || "0"}
                  </div>
                </div>
                {data.user.biweeklySalary !== undefined && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Biweekly Salary</div>
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      ₱{data.user.biweeklySalary?.toLocaleString() || "0"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
    </div>
  )
}

















