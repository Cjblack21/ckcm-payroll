'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { createUserAccount } from '@/lib/actions/auth'
import { Sun, Moon, Monitor, User, Mail, Briefcase, Building2, IdCard, Shield } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PersonnelType {
  personnel_types_id: string
  name: string
  type?: string
  department?: string
  basicSalary: number
  isActive: boolean
}

export default function AccountSetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [personnelTypes, setPersonnelTypes] = useState<PersonnelType[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [availablePositions, setAvailablePositions] = useState<PersonnelType[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [formData, setFormData] = useState({
    schoolId: '',
    personnelTypeId: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'SETUP_REQUIRED') {
      router.push('/')
      return
    }

    fetchPersonnelTypes()
  }, [session, status, router])

  const fetchPersonnelTypes = async () => {
    try {
      const response = await fetch('/api/personnel-types')
      if (response.ok) {
        const types = await response.json()
        setPersonnelTypes(types)
      } else {
        console.error('Failed to fetch personnel types:', response.statusText)
        toast.error('Failed to load personnel types')
      }
    } catch (error) {
      console.error('Error fetching personnel types:', error)
      toast.error('Failed to load personnel types')
    }
  }

  // Get unique departments from personnel types
  const uniqueDepartments = Array.from(
    new Set(personnelTypes.map(p => p.department).filter(Boolean))
  ).sort()

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value)

    const filtered = personnelTypes.filter(p => p.department === value)
    setAvailablePositions(filtered)

    // Auto-select if only one position exists for this category (handles the simplified schema)
    if (filtered.length === 1) {
      setFormData({ ...formData, personnelTypeId: filtered[0].personnel_types_id })
    } else {
      setFormData({ ...formData, personnelTypeId: '' })
    }
  }

  const handlePositionChange = (value: string) => {
    setFormData({ ...formData, personnelTypeId: value })
  }

  // ... 


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.schoolId.trim()) {
      toast.error('Please enter your School ID')
      return
    }

    if (!formData.personnelTypeId) {
      toast.error('Please select your Position')
      return
    }

    if (!session?.user) {
      toast.error('Session not found. Please sign in again.')
      return
    }

    setLoading(true)

    try {
      const result = await createUserAccount({
        email: session.user.email,
        name: session.user.name || '',
        schoolId: formData.schoolId.trim(),
        personnelTypeId: formData.personnelTypeId,
        department: selectedDepartment || undefined,
        image: session.user.image || ''
      })

      if (result.success) {
        setShowSuccessModal(true)
      } else {
        toast.error(result.error || 'Failed to create account')
      }
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    await signOut({ redirect: false })
    router.push('/')
  }

  const handleSuccessClose = async () => {
    setShowSuccessModal(false)
    await signOut({ redirect: false })
    router.push('/')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'SETUP_REQUIRED') {
    return null
  }

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-md w-full animate-in zoom-in duration-300">
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600 dark:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Message */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Account Created!
                </h3>
                <div className="space-y-1">
                  <p className="text-slate-600 dark:text-slate-400">
                    Welcome to POBLACION - PMS,
                  </p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">
                    {session.user.name?.split(' ')[0]}!
                  </p>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Your account is ready. You can now sign in.
                </p>
              </div>

              {/* Button */}
              <Button
                onClick={handleSuccessClose}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500">

        {/* Theme Switcher */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="fixed top-6 right-6 z-50 h-11 w-11 rounded-xl bg-slate-900/90 backdrop-blur-sm hover:bg-slate-900 shadow-lg hover:shadow-xl transition-all duration-300 dark:bg-white/90 dark:hover:bg-white border border-slate-800 dark:border-slate-200 group"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-orange-400" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-indigo-600" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2">
                <Sun className="h-4 w-4 text-orange-500" />
                <span>Light</span>
                {theme === "light" && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Dark</span>
                {theme === "dark" && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2">
                <Monitor className="h-4 w-4 text-slate-500" />
                <span>System</span>
                {theme === "system" && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Left Side - Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left duration-700">
            {/* Logo & Brand */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center mb-4">
                <img src="/brgy-logo.png" alt="Barangay Logo" className="w-32 h-32 object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Complete Setup
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Welcome {session.user.name?.split(' ')[0]}! Finish setting up your account
              </p>
            </div>

            {/* Setup Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={session.user.email}
                    disabled
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* School ID */}
                <div className="space-y-2">
                  <Label htmlFor="schoolId" className="text-sm font-medium flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    School ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="schoolId"
                    type="text"
                    placeholder="Enter your School ID"
                    value={formData.schoolId}
                    onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                    required
                    className="h-12 rounded-xl transition-all focus-visible:ring-2"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This will serve as your unique identifier in the system
                  </p>
                </div>

                {/* Department - Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Position Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept as string}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Position - Filtered by Department */}
                {/* Only show if there's more than 1 option, otherwise it's redundant for the user */}
                {availablePositions.length > 1 && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="position" className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Specific Position <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.personnelTypeId}
                      onValueChange={handlePositionChange}
                      disabled={!selectedDepartment}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select specific position" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePositions.map((type) => (
                          <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 h-12 rounded-xl font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40"
                    disabled={loading}
                  >
                    {loading ? 'Setting up...' : 'Complete Setup'}
                  </Button>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-500 pt-4">
                  <Shield className="h-3 w-3" />
                  <span>Your information is secured with encryption</span>
                </div>
              </form>
            </div>

            {/* Footer */}
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              © 2026 PMS. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-orange-500 to-red-600 p-12 items-center justify-center relative overflow-hidden animate-in fade-in slide-in-from-right duration-700">
          {/* Decorative Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-white space-y-8 max-w-lg text-center lg:text-left">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold leading-tight">
                Welcome to
                <br />
                POBLACION - PMS
              </h2>
              <p className="text-xl text-white/90">
                Complete your account setup to access our comprehensive Payroll Management System
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Personalized Dashboard</h3>
                  <p className="text-white/80">Access your payroll information anytime</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Secure & Protected</h3>
                  <p className="text-white/80">Your data is encrypted and safe</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Easy Management</h3>
                  <p className="text-white/80">Streamlined payroll and attendance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
