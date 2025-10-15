'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'react-hot-toast'
import { createUserAccount } from '@/lib/actions/auth'

interface PersonnelType {
  personnel_types_id: string
  name: string
  basicSalary: number
  isActive: boolean
}

export default function AccountSetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [personnelTypes, setPersonnelTypes] = useState<PersonnelType[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    schoolId: '',
    personnelTypeId: ''
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'SETUP_REQUIRED') {
      router.push('/')
      return
    }

    // Fetch personnel types
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.schoolId.trim()) {
      toast.error('Please enter your School ID')
      return
    }

    if (!formData.personnelTypeId) {
      toast.error('Please select a Personnel Type')
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
        image: session.user.image || ''
      })

      if (result.success) {
        toast.success('Account setup completed successfully!')
        // Sign out and redirect to login to refresh session
        await signOut({ redirect: false })
        router.push('/')
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
              <AvatarFallback>
                {session.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle>Complete Your Account Setup</CardTitle>
          <CardDescription>
            Welcome {session.user.name}! Please provide the following information to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={session.user.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolId">School ID *</Label>
              <Input
                id="schoolId"
                type="text"
                placeholder="Enter your School ID"
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                required
              />
              <p className="text-sm text-muted-foreground">
                This will serve as your unique user identifier in the system.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personnelType">Personnel Type *</Label>
              <Select
                value={formData.personnelTypeId}
                onValueChange={(value) => setFormData({ ...formData, personnelTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your personnel type" />
                </SelectTrigger>
                <SelectContent>
                  {personnelTypes.map((type) => (
                    <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
