"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Upload, 
  Save, 
  Eye, 
  Building2, 
  MapPin, 
  FileText,
  Image as ImageIcon,
  Type,
  AlignCenter,
  X,
  Check
} from "lucide-react"
import { toast } from "react-hot-toast"

type HeaderSettings = {
  schoolName: string
  schoolAddress: string
  systemName: string
  logoUrl: string
  showLogo: boolean
  headerAlignment: 'left' | 'center' | 'right'
  fontSize: 'small' | 'medium' | 'large'
  customText: string
  workingDays: string[]
}

export default function HeaderSettingsPage() {
  const [settings, setSettings] = useState<HeaderSettings>({
    schoolName: "Christ the King College De Maranding",
    schoolAddress: "Maranding Lala Lanao del Norte",
    systemName: "CKCM PMS (Payroll Management System)",
    logoUrl: "/ckcm.png",
    showLogo: true,
    headerAlignment: 'center',
    fontSize: 'medium',
    customText: "",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  })
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await fetch('/api/admin/header-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading header settings:', error)
    }
  }

  async function saveSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/header-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        toast.success('Header settings saved successfully!')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving header settings:', error)
      toast.error('Failed to save header settings')
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(field: keyof HeaderSettings, value: string | boolean) {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  function resetToDefaults() {
    setSettings({
      schoolName: "Christ the King College De Maranding",
      schoolAddress: "Maranding Lala Lanao del Norte",
      systemName: "CKCM PMS (Payroll Management System)",
      logoUrl: "/ckcm.png",
      showLogo: true,
      headerAlignment: 'center',
      fontSize: 'medium',
      customText: "",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    })
    setSelectedFile(null)
    setLogoPreview(null)
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      
      setSelectedFile(file)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
    }
  }

  async function uploadLogo() {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', selectedFile)
      
      const res = await fetch('/api/admin/header-settings/upload-logo', {
        method: 'POST',
        body: formData
      })
      
      if (res.ok) {
        const data = await res.json()
        setSettings(prev => ({ ...prev, logoUrl: data.logoUrl }))
        setSelectedFile(null)
        setLogoPreview(null)
        toast.success('Logo uploaded successfully!')
      } else {
        throw new Error('Failed to upload logo')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  function removeSelectedFile() {
    setSelectedFile(null)
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
      setLogoPreview(null)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Header Settings
          </h2>
          <p className="text-muted-foreground">Customize the payroll slip header design and content</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPreviewMode(!previewMode)}
            className="hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button 
            onClick={saveSettings}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* School Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                School Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  School Name
                </Label>
                <Input
                  id="schoolName"
                  value={settings.schoolName}
                  onChange={(e) => handleInputChange('schoolName', e.target.value)}
                  placeholder="Enter school name"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  School Address
                </Label>
                <Textarea
                  id="schoolAddress"
                  value={settings.schoolAddress}
                  onChange={(e) => handleInputChange('schoolAddress', e.target.value)}
                  placeholder="Enter school address"
                  className="w-full min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemName" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  System Name
                </Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => handleInputChange('systemName', e.target.value)}
                  placeholder="Enter system name"
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-green-600" />
                Logo Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Logo Display */}
              <div className="space-y-2">
                <Label>Current Logo</Label>
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                  <img 
                    src={settings.logoUrl} 
                    alt="Current Logo" 
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/ckcm.png'
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current Logo</p>
                    <p className="text-xs text-muted-foreground">{settings.logoUrl}</p>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label>Upload New Logo</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="logoUpload"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="logoUpload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </label>
                </div>
              </div>

              {/* Selected File Preview */}
              {selectedFile && (
                <div className="space-y-2">
                  <Label>Selected File</Label>
                  <div className="flex items-center gap-4 p-4 border rounded-lg bg-blue-50">
                    {logoPreview && (
                      <img 
                        src={logoPreview} 
                        alt="Preview" 
                        className="h-16 w-auto object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={uploadLogo}
                        disabled={uploading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={removeSelectedFile}
                        className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual URL Input */}
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Or enter logo URL manually</Label>
                <Input
                  id="logoUrl"
                  value={settings.logoUrl}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="/path/to/logo.png"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Use /ckcm.png for the default CKCM logo
                </p>
              </div>

              {/* Show Logo Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showLogo"
                  checked={settings.showLogo}
                  onChange={(e) => handleInputChange('showLogo', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="showLogo">Show logo on payroll slip</Label>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlignCenter className="h-5 w-5 text-purple-600" />
                Display Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Header Alignment</Label>
                <div className="flex gap-2">
                  {(['left', 'center', 'right'] as const).map((alignment) => (
                    <Button
                      key={alignment}
                      variant={settings.headerAlignment === alignment ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleInputChange('headerAlignment', alignment)}
                      className="capitalize"
                    >
                      {alignment}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Font Size</Label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <Button
                      key={size}
                      variant={settings.fontSize === size ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleInputChange('fontSize', size)}
                      className="capitalize"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customText">Custom Text (Optional)</Label>
                <Textarea
                  id="customText"
                  value={settings.customText}
                  onChange={(e) => handleInputChange('customText', e.target.value)}
                  placeholder="Any additional text to display in the header"
                  className="w-full min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Days Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Working Days Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Working Days</Label>
                <p className="text-sm text-muted-foreground">
                  Choose which days of the week are considered working days for payroll calculations.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`workingDay-${day}`}
                        checked={settings.workingDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSettings(prev => ({
                              ...prev,
                              workingDays: [...prev.workingDays, day]
                            }))
                          } else {
                            setSettings(prev => ({
                              ...prev,
                              workingDays: prev.workingDays.filter(d => d !== day)
                            }))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`workingDay-${day}`} className="text-sm">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Selected: {settings.workingDays.join(', ') || 'None'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={resetToDefaults}
                  variant="outline"
                  className="hover:bg-gray-50 w-full sm:w-auto"
                >
                  Reset to Defaults
                </Button>
                <Button 
                  onClick={saveSettings}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-orange-600" />
                Header Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewMode ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
                    <div 
                      className={`text-${settings.fontSize === 'small' ? 'sm' : settings.fontSize === 'large' ? 'lg' : 'base'} ${
                        settings.headerAlignment === 'center' ? 'text-center' : 
                        settings.headerAlignment === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {settings.showLogo && (
                        <div className="mb-4">
                          <img 
                            src={settings.logoUrl} 
                            alt="School Logo" 
                            className="h-16 w-auto mx-auto"
                            onError={(e) => {
                              e.currentTarget.src = '/ckcm.png'
                            }}
                          />
                        </div>
                      )}
                      <div className="font-bold text-lg">
                        {settings.schoolName}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {settings.schoolAddress}
                      </div>
                      <Separator className="my-2" />
                      <div className="font-semibold text-blue-600">
                        {settings.systemName}
                      </div>
                      {settings.customText && (
                        <div className="text-sm text-gray-500 mt-2">
                          {settings.customText}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    This is how the header will appear on payroll slips
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2" />
                  <p>Click "Show Preview" to see the header design</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
