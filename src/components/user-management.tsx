"use client"

import { useState, useEffect } from 'react'
import { SSRSafe } from "@/components/ssr-safe"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  UserCheck, 
  UserX,
  Archive,
  Trash2
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'react-hot-toast'
import { Checkbox } from '@/components/ui/checkbox'

interface User {
  users_id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'PERSONNEL'
  isActive: boolean
  createdAt: string
  updatedAt: string
  personnel_types_id?: string | null
  personnelType?: {
    name: string
    type?: 'TEACHING' | 'NON_TEACHING' | null
    basicSalary: number
    department?: string | null
  } | null
  currentLeave?: {
    startDate: string
    endDate: string
    type: string
    isPaid: boolean
  } | null
}

interface PersonnelTypeWithDept {
  personnel_types_id: string
  name: string
  type?: 'TEACHING' | 'NON_TEACHING' | null
  department?: string | null
}

interface UserFormData {
  email: string
  name: string
  role: 'ADMIN' | 'PERSONNEL'
  password?: string
  isActive: boolean
  personnel_types_id?: string
}

// Helper function to get initials for avatar
function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.charAt(0).toUpperCase()
}

export function UserManagement() {
  const [personnel, setPersonnel] = useState<User[]>([])
  const [filteredPersonnel, setFilteredPersonnel] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState<User | null>(null)
  const [personnelTypes, setPersonnelTypes] = useState<PersonnelTypeWithDept[]>([])
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<Set<string>>(new Set())
  const [showDeactivated, setShowDeactivated] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [pendingDeactivation, setPendingDeactivation] = useState<User | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    role: 'PERSONNEL',
    password: '',
    isActive: true
  })

  // Fetch personnel
  const fetchPersonnel = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to fetch personnel')
      const data = await response.json()
      const personnelArray = data.users || data || []
      setPersonnel(personnelArray)
      setFilteredPersonnel(personnelArray)
    } catch (error) {
      console.error('Error fetching personnel:', error)
      toast.error('Failed to fetch personnel')
    } finally {
      setLoading(false)
    }
  }

  // Filter personnel based on search and role
  useEffect(() => {
    let filtered = personnel

    // Filter by active/deactivated status
    if (showDeactivated) {
      filtered = filtered.filter(person => !person.isActive)
    } else {
      filtered = filtered.filter(person => person.isActive)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(person => 
        person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply role filter
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(person => person.role === roleFilter)
    }

    setFilteredPersonnel(filtered)
  }, [personnel, searchTerm, roleFilter, showDeactivated])

  // Load personnel on mount
  useEffect(() => {
    fetchPersonnel()
    ;(async () => {
      try {
        console.log('Fetching personnel types from /api/admin/personnel-types...')
        const res = await fetch('/api/admin/personnel-types', { cache: 'no-store' })
        console.log('Personnel types response status:', res.status)
        
        if (!res.ok) {
          const errorText = await res.text()
          console.error('Failed to fetch personnel types:', res.status, errorText)
          toast.error('Failed to load personnel types')
          return
        }
        
        const data = await res.json()
        console.log('Loaded personnel types:', data)
        console.log('Number of personnel types:', data.length)
        setPersonnelTypes(data)
        
        if (data.length === 0) {
          console.warn('No personnel types found. Please create some in Personnel Types page.')
          toast.error('No personnel types found. Please create personnel types first.')
        }
      } catch (error) {
        console.error('Error loading personnel types:', error)
        toast.error('Failed to load personnel types')
      }
    })()
  }, [])

  // Handle create personnel
  const handleCreatePersonnel = async () => {
    // Validate required fields
    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!formData.name || formData.name.trim().length === 0) {
      toast.error('Please enter a full name')
      return
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        let message = 'Failed to create personnel'
        try {
          const data = await response.json()
          console.error('API Error Response:', data)
          if (data.details && Array.isArray(data.details)) {
            // Zod validation errors
            message = data.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ')
          } else {
            message = data.error || message
          }
        } catch {
          message = await response.text()
        }
        toast.error(message)
        console.error('Create personnel error:', message)
        return
      }

      toast.success('Personnel created successfully')
      setIsCreateDialogOpen(false)
      setFormData({ email: '', name: '', role: 'PERSONNEL', password: '', isActive: true })
      fetchPersonnel()
    } catch (error) {
      console.error('Error creating personnel:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create personnel')
    }
  }

  // Handle update personnel
  const handleUpdatePersonnel = async () => {
    if (!selectedPersonnel) return

    try {
      const updateData: Record<string, unknown> = { ...formData }
      if (!updateData.password) {
        delete updateData.password
      }
      // Ensure personnel_types_id key exists (empty string means clear)
      if (!Object.prototype.hasOwnProperty.call(updateData, 'personnel_types_id')) {
        ;(updateData as Record<string, unknown>).personnel_types_id = ''
      }

      const response = await fetch(`/api/admin/users/${selectedPersonnel.users_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        let message = 'Failed to update personnel'
        try {
          const data = await response.json()
          message = data.error || message
        } catch {
          message = await response.text()
        }
        throw new Error(message)
      }

      toast.success('Personnel updated successfully')
      setIsEditDialogOpen(false)
      setSelectedPersonnel(null)
      fetchPersonnel()
    } catch (error) {
      console.error('Error updating personnel:', error)
      toast.error('Failed to update personnel')
    }
  }


  // Handle toggle personnel status
  const handleTogglePersonnelStatus = async (person: User) => {
    // If trying to deactivate an ADMIN, require password confirmation
    if (person.role === 'ADMIN' && person.isActive) {
      setPendingDeactivation(person)
      setShowPasswordDialog(true)
      return
    }

    // For non-admin or reactivation, proceed directly
    await performStatusToggle(person)
  }

  // Perform the actual status toggle
  const performStatusToggle = async (person: User) => {
    try {
      const response = await fetch(`/api/admin/users/${person.users_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...person, isActive: !person.isActive })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      toast.success(`Personnel ${!person.isActive ? 'activated' : 'deactivated'} successfully`)
      fetchPersonnel()
    } catch (error) {
      console.error('Error toggling personnel status:', error)
      toast.error('Failed to update personnel status')
    }
  }

  // Verify admin password and proceed with deactivation
  const handleConfirmDeactivation = async () => {
    if (!pendingDeactivation || !adminPassword) {
      toast.error('Please enter your admin password')
      return
    }

    try {
      // Verify admin password
      const verifyResponse = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      })

      if (!verifyResponse.ok) {
        toast.error('Incorrect admin password')
        return
      }

      // Password verified, proceed with deactivation
      await performStatusToggle(pendingDeactivation)
      
      // Close dialog and reset
      setShowPasswordDialog(false)
      setAdminPassword('')
      setPendingDeactivation(null)
    } catch (error) {
      console.error('Error verifying password:', error)
      toast.error('Failed to verify password')
    }
  }

  // Open edit dialog
  const openEditDialog = (person: User) => {
    setSelectedPersonnel(person)
    setFormData({
      email: person.email,
      name: person.name || '',
      role: person.role,
      password: '',
      isActive: person.isActive,
      personnel_types_id: person.personnel_types_id || undefined
    })
    setIsEditDialogOpen(true)
  }

  // Open view dialog
  const openViewDialog = (person: User) => {
    setSelectedPersonnel(person)
    setIsViewDialogOpen(true)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPersonnelIds(new Set(filteredPersonnel.map(p => p.users_id)))
    } else {
      setSelectedPersonnelIds(new Set())
    }
  }

  // Handle individual selection
  const handleSelectPersonnel = (personnelId: string, checked: boolean) => {
    const newSelected = new Set(selectedPersonnelIds)
    if (checked) {
      newSelected.add(personnelId)
    } else {
      newSelected.delete(personnelId)
    }
    setSelectedPersonnelIds(newSelected)
  }

  // Handle bulk activate
  const handleBulkActivate = async () => {
    if (selectedPersonnelIds.size === 0) return
    
    try {
      const promises = Array.from(selectedPersonnelIds).map(personnelId => {
        const person = personnel.find(p => p.users_id === personnelId)
        if (!person) return Promise.resolve()
        
        return fetch(`/api/admin/users/${personnelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...person, isActive: true })
        })
      })

      await Promise.all(promises)
      toast.success(`Activated ${selectedPersonnelIds.size} personnel`)
      setSelectedPersonnelIds(new Set())
      fetchPersonnel()
    } catch (error) {
      console.error('Error activating personnel:', error)
      toast.error('Failed to activate some personnel')
    }
  }

  // Handle bulk deactivate
  const handleBulkDeactivate = async () => {
    if (selectedPersonnelIds.size === 0) return
    
    try {
      const promises = Array.from(selectedPersonnelIds).map(personnelId => {
        const person = personnel.find(p => p.users_id === personnelId)
        if (!person) return Promise.resolve()
        
        return fetch(`/api/admin/users/${personnelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...person, isActive: false })
        })
      })

      await Promise.all(promises)
      toast.success(`Deactivated ${selectedPersonnelIds.size} personnel`)
      setSelectedPersonnelIds(new Set())
      fetchPersonnel()
    } catch (error) {
      console.error('Error deactivating personnel:', error)
      toast.error('Failed to deactivate some personnel')
    }
  }

  // Delete flow handlers
  const [deleteRecordCounts, setDeleteRecordCounts] = useState<{
    attendance: number
    payroll: number
    loans: number
    deductions: number
  } | null>(null)

  const handleDeleteRequest = async (person: User) => {
    setPendingDelete(person)
    setDeleteRecordCounts(null)
    
    // First check if there are related records
    try {
      const response = await fetch(`/api/admin/users/${person.users_id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const data = await response.json()
        if (data.needsForce && data.counts) {
          setDeleteRecordCounts(data.counts)
        }
      }
    } catch (error) {
      console.error('Error checking delete:', error)
    }
    
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async (force: boolean = false) => {
    if (!pendingDelete) return
    try {
      const url = force 
        ? `/api/admin/users/${pendingDelete.users_id}?force=true`
        : `/api/admin/users/${pendingDelete.users_id}`
        
      const response = await fetch(url, {
        method: 'DELETE'
      })

      if (!response.ok) {
        let message = 'Failed to delete personnel'
        try {
          const data = await response.json()
          if (data.needsForce && !force) {
            // This shouldn't happen as we check first, but handle it
            setDeleteRecordCounts(data.counts)
            return
          }
          message = data.error || message
        } catch {
          message = await response.text()
        }
        throw new Error(message)
      }

      toast.success('Personnel deleted successfully')
      setIsDeleteDialogOpen(false)
      setPendingDelete(null)
      setDeleteRecordCounts(null)
      fetchPersonnel()
    } catch (error) {
      console.error('Error deleting personnel:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete personnel')
    }
  }

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setPendingDelete(null)
    setDeleteRecordCounts(null)
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {selectedPersonnelIds.size > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              {selectedPersonnelIds.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {selectedPersonnelIds.size > 0 && (
            <>
              <Button 
                onClick={handleBulkActivate} 
                variant="outline" 
                size="sm"
                className="text-green-600 hover:text-green-700"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Activate
              </Button>
              <Button 
                onClick={handleBulkDeactivate} 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </>
          )}
          <Button 
            onClick={() => setShowDeactivated(!showDeactivated)} 
            variant={showDeactivated ? "default" : "outline"}
            size="sm"
          >
            <Archive className="h-4 w-4 mr-2" />
            {showDeactivated ? 'Show Active' : 'Show Deactivated'}
          </Button>
          <SSRSafe>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Personnel
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Personnel</DialogTitle>
                <DialogDescription>
                  Add new personnel to the system with their role and permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-name">Full Name</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-password">Password *</Label>
                  <Input
                    id="create-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'ADMIN' | 'PERSONNEL') => 
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERSONNEL">Personnel</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-personnel-type">Position</Label>
                  <Select
                    value={formData.personnel_types_id || 'none'}
                    onValueChange={(value) => {
                      console.log('Selected position:', value)
                      const selectedType = personnelTypes.find(t => t.personnel_types_id === value)
                      console.log('Selected type details:', selectedType)
                      setFormData({ ...formData, personnel_types_id: value === "none" ? undefined : value })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No position</SelectItem>
                      {personnelTypes.map((type) => (
                        <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-department">Department</Label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                    {formData.personnel_types_id && formData.personnel_types_id !== 'none' 
                      ? (personnelTypes.find(t => t.personnel_types_id === formData.personnel_types_id)?.department || 'No department assigned')
                      : 'Select a position first'}
                  </div>
                  <p className="text-xs text-muted-foreground">Department is set by the position. To change it, update the position settings.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePersonnel}>
                  Create Personnel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </SSRSafe>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
            <div className="flex-1">
              <Label htmlFor="search">Search Personnel</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label>Filter by Role</Label>
              <SSRSafe>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin Only</SelectItem>
                    <SelectItem value="PERSONNEL">Personnel Only</SelectItem>
                  </SelectContent>
                </Select>
              </SSRSafe>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personnel Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showDeactivated ? 'Deactivated Personnel' : 'Active Personnel'} ({filteredPersonnel.length})
          </CardTitle>
          <CardDescription>
            Showing {filteredPersonnel.length} of {showDeactivated ? personnel.filter(p => !p.isActive).length : personnel.filter(p => p.isActive).length} {showDeactivated ? 'deactivated' : 'active'} personnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">Loading personnel...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={filteredPersonnel.length > 0 && selectedPersonnelIds.size === filteredPersonnel.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Personnel ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Personnel Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonnel.map((person) => (
                  <TableRow key={person.users_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPersonnelIds.has(person.users_id)}
                        onCheckedChange={(checked) => handleSelectPersonnel(person.users_id, checked as boolean)}
                        aria-label={`Select ${person.name || person.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {getInitials(person.name, person.email)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {person.users_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {person.name || 'No name set'}
                    </TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>
                      <div className="max-w-[220px] truncate text-muted-foreground text-xs">
                        {person.personnelType?.department || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {person.personnelType?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {person.personnelType?.type ? (
                        <Badge 
                          variant={person.personnelType.type === 'TEACHING' ? 'default' : 'secondary'}
                          className={person.personnelType.type === 'TEACHING' 
                            ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                            : 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                          }
                        >
                          {person.personnelType.type === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={person.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {person.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={person.isActive ? 'default' : 'destructive'}>
                          {person.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {person.currentLeave && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 cursor-help">
                                  🏖️ On Leave
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <p className="font-semibold">{person.currentLeave.type}</p>
                                  <p>{new Date(person.currentLeave.startDate).toLocaleDateString()} - {new Date(person.currentLeave.endDate).toLocaleDateString()}</p>
                                  <p className="text-muted-foreground">{person.currentLeave.isPaid ? 'Paid' : 'Unpaid'}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(person.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(person)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(person)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Personnel
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePersonnelStatus(person)}>
                            {person.isActive ? (
                              <UserX className="mr-2 h-4 w-4" />
                            ) : (
                              <UserCheck className="mr-2 h-4 w-4" />
                            )}
                            {person.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteRequest(person)} className="text-red-600 focus:text-red-700">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPersonnel.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      No personnel found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Personnel Dialog */}
      <SSRSafe>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Personnel</DialogTitle>
            <DialogDescription>
              Update personnel information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave empty to keep current password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'ADMIN' | 'PERSONNEL') => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONNEL">Personnel</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-personnel-type">Position</Label>
              <Select
                value={formData.personnel_types_id || 'none'}
                onValueChange={(value) => 
                  setFormData({ ...formData, personnel_types_id: value === "none" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No position</SelectItem>
                  {personnelTypes.map((type) => (
                    <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-department">Department</Label>
              <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                {formData.personnel_types_id && formData.personnel_types_id !== 'none' 
                  ? (personnelTypes.find(t => t.personnel_types_id === formData.personnel_types_id)?.department || 'No department assigned')
                  : 'Select a position first'}
              </div>
              <p className="text-xs text-muted-foreground">Department is set by the position. To change it, update the position settings.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePersonnel}>
              Update Personnel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </SSRSafe>

      {/* View Personnel Dialog */}
      <SSRSafe>
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Personnel Details</DialogTitle>
            <DialogDescription>
              View detailed information about this personnel.
            </DialogDescription>
          </DialogHeader>
          {selectedPersonnel && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Personnel ID</Label>
                <div className="text-sm text-muted-foreground font-mono">
                  {selectedPersonnel.users_id}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <div>{selectedPersonnel.email}</div>
              </div>
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <div>{selectedPersonnel.name || 'No name set'}</div>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Badge variant={selectedPersonnel.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {selectedPersonnel.role}
                </Badge>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Badge variant={selectedPersonnel.isActive ? 'default' : 'destructive'}>
                  {selectedPersonnel.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="grid gap-2">
                <Label>Created</Label>
                <div>{new Date(selectedPersonnel.createdAt).toLocaleString()}</div>
              </div>
              <div className="grid gap-2">
                <Label>Last Updated</Label>
                <div>{new Date(selectedPersonnel.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </SSRSafe>

      {/* Delete Confirmation Dialog */}
      <SSRSafe>
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setPendingDelete(null)
            setDeleteRecordCounts(null)
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Personnel
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the personnel account.
              </DialogDescription>
            </DialogHeader>
            {pendingDelete && (
              <div className="space-y-4 py-2">
                <div className="text-sm">
                  Are you sure you want to delete
                  {' '}
                  <span className="font-semibold">{pendingDelete.name || pendingDelete.email}</span>
                  ?
                </div>
                <div className="text-xs text-muted-foreground">
                  ID: <span className="font-mono">{pendingDelete.users_id}</span>
                </div>
                
                {deleteRecordCounts && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-3">
                      ⚠️ Warning: This personnel has existing records
                    </p>
                    <div className="space-y-2 text-sm text-red-800 dark:text-red-200">
                      {deleteRecordCounts.attendance > 0 && (
                        <div className="flex justify-between">
                          <span>Attendance records:</span>
                          <span className="font-semibold">{deleteRecordCounts.attendance}</span>
                        </div>
                      )}
                      {deleteRecordCounts.payroll > 0 && (
                        <div className="flex justify-between">
                          <span>Payroll entries:</span>
                          <span className="font-semibold">{deleteRecordCounts.payroll}</span>
                        </div>
                      )}
                      {deleteRecordCounts.loans > 0 && (
                        <div className="flex justify-between">
                          <span>Loans:</span>
                          <span className="font-semibold">{deleteRecordCounts.loans}</span>
                        </div>
                      )}
                      {deleteRecordCounts.deductions > 0 && (
                        <div className="flex justify-between">
                          <span>Deductions:</span>
                          <span className="font-semibold">{deleteRecordCounts.deductions}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-3 font-medium">
                      All of these records will be permanently deleted. This action cannot be undone.
                    </p>
                  </div>
                )}
                
                {!deleteRecordCounts && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      This personnel has no attendance, payroll, loan, or deduction records.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleCancelDelete} className="w-full sm:w-auto">
                Cancel
              </Button>
              {deleteRecordCounts ? (
                <Button 
                  variant="destructive" 
                  onClick={() => handleConfirmDelete(true)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Force Delete All
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={() => handleConfirmDelete(false)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Personnel
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe>

      {/* Admin Password Confirmation Dialog */}
      <SSRSafe>
        <Dialog open={showPasswordDialog} onOpenChange={(open) => {
          setShowPasswordDialog(open)
          if (!open) {
            setAdminPassword('')
            setPendingDeactivation(null)
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <UserX className="h-5 w-5" />
                Deactivate Admin Account
              </DialogTitle>
              <DialogDescription>
                You are about to deactivate an <strong>ADMIN</strong> account. This is a sensitive action that requires verification.
              </DialogDescription>
            </DialogHeader>
            {pendingDeactivation && (
              <div className="space-y-4 py-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-900 mb-2">Account to be deactivated:</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${pendingDeactivation.name || pendingDeactivation.email}`} />
                      <AvatarFallback>{getInitials(pendingDeactivation.name, pendingDeactivation.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-amber-900">{pendingDeactivation.name || pendingDeactivation.email}</p>
                      <p className="text-sm text-amber-700">{pendingDeactivation.email}</p>
                      <Badge variant="destructive" className="mt-1">ADMIN</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-sm font-medium">
                    Enter your admin password to confirm
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConfirmDeactivation()
                      }
                    }}
                    className="border-red-200 focus:border-red-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    This verification ensures only authorized admins can deactivate admin accounts.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordDialog(false)
                  setAdminPassword('')
                  setPendingDeactivation(null)
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmDeactivation}
                disabled={!adminPassword}
              >
                <UserX className="h-4 w-4 mr-2" />
                Confirm Deactivation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe>
    </div>
  )
}


