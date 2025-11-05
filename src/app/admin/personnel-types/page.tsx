"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Eye, UserCheck } from "lucide-react"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { SSRSafe } from "@/components/ssr-safe"
import { getPersonnelTypes, createPersonnelType, updatePersonnelType, deletePersonnelType, type PersonnelType as ServerPersonnelType } from "@/lib/actions/personnel"

type PersonnelType = {
  personnel_types_id: string
  name: string
  type?: string | null
  department?: string | null
  basicSalary: number
  isActive: boolean
  createdAt: string
}

function parseSalary(input: string): number {
  const s = input.trim().toLowerCase().replace(/[\s,]/g, "")
  const m = s.match(/^(\d*\.?\d+)([kmb])?$/)
  if (!m) return Number(s) || 0
  const v = Number(m[1])
  const suf = m[2]
  if (suf === 'k') return v * 1_000
  if (suf === 'm') return v * 1_000_000
  if (suf === 'b') return v * 1_000_000_000
  return v
}

export default function PersonnelTypesPage() {
  const [types, setTypes] = useState<PersonnelType[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<PersonnelType | null>(null)
  const [name, setName] = useState("")
  const [personnelType, setPersonnelType] = useState("NON_TEACHING")
  const [department, setDepartment] = useState("")
  const [basicSalaryInput, setBasicSalaryInput] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [attendanceSettings, setAttendanceSettings] = useState<any>(null)
  const [workingDays, setWorkingDays] = useState(22) // Default fallback

  const basic = useMemo(() => parseSalary(basicSalaryInput), [basicSalaryInput])
  const semiMonthly = useMemo(() => basic / 2, [basic])
  const weekly = useMemo(() => basic / 4, [basic])
  const daily = useMemo(() => basic / workingDays, [basic, workingDays]) // Daily based on actual working days in period
  const hourly = useMemo(() => daily / 8, [daily])
  const min = useMemo(() => hourly / 60, [hourly])
  const sec = useMemo(() => min / 60, [min])

  async function load() {
    try {
      setLoading(true)
      
      // Load positions
      const result = await getPersonnelTypes()
      
      if (!result.success) {
        toast.error(result.error || 'Failed to load types')
        return
      }
      
      // Transform server data to match local type
      const transformedTypes: PersonnelType[] = (result.personnelTypes || []).map((type: ServerPersonnelType) => ({
        personnel_types_id: type.personnel_types_id,
        name: type.name,
        type: type.type || null,
        department: type.department || null,
        basicSalary: type.basicSalary,
        isActive: type.isActive,
        createdAt: type.createdAt.toISOString()
      }))
      setTypes(transformedTypes)
      
      // Load attendance settings to get working days
      await loadAttendanceSettings()
    } catch {
      toast.error('Failed to load types')
    } finally {
      setLoading(false)
    }
  }

  async function loadAttendanceSettings() {
    try {
      const response = await fetch('/api/admin/attendance-settings')
      if (response.ok) {
        const data = await response.json()
        setAttendanceSettings(data.settings)
        
        // Calculate working days if period is set
        if (data.settings?.periodStart && data.settings?.periodEnd) {
          const startDate = new Date(data.settings.periodStart)
          const endDate = new Date(data.settings.periodEnd)
          let days = 0
          
          const currentDate = new Date(startDate)
          while (currentDate <= endDate) {
            if (currentDate.getDay() !== 0) { // Exclude Sundays
              days++
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }
          
          console.log('Calculated working days from period:', days, 'Period:', data.settings.periodStart, 'to', data.settings.periodEnd)
          
          // Ensure minimum working days is reasonable (at least 22 for monthly salary calculations)
          // This prevents incorrect daily rates when period is set incorrectly
          if (days >= 22 && days <= 31) {
            setWorkingDays(days)
            console.log('Using calculated working days:', days)
          } else {
            console.warn('Calculated working days is out of valid range:', days, '- using default 22')
            setWorkingDays(22)
          }
        } else {
          console.log('No attendance period set - using default 22 working days')
          setWorkingDays(22)
        }
      }
    } catch (error) {
      console.error('Error loading attendance settings:', error)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setName('')
    setPersonnelType('NON_TEACHING')
    setDepartment('')
    setBasicSalaryInput('')
    setIsActive(true)
    setSelectedType(null)
  }

  async function create() {
    // Validation
    if (!name.trim()) {
      toast.error('Position name is required')
      return
    }
    
    if (!basicSalaryInput.trim() || basic <= 0) {
      toast.error('Valid monthly salary is required')
      return
    }
    
    try {
      console.log('Creating position with data:', {
        name,
        type: personnelType,
        department: department || undefined,
        basicSalary: basic,
        isActive
      })
      
      const result = await createPersonnelType({
        name,
        type: personnelType,
        department: department || undefined,
        basicSalary: basic,
        isActive
      })
      
      console.log('Create result:', result)
      
      if (!result.success) {
        console.error('Failed to create position:', result.error)
        toast.error(result.error || 'Failed to add position')
        return
      }
      
      toast.success('Position added successfully!')
      setOpen(false)
      resetForm()
      load()
    } catch (error) {
      console.error('Error creating position:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to add position'
      toast.error(errorMsg)
    }
  }

  async function update() {
    if (!selectedType) return
    
    try {
      const result = await updatePersonnelType(selectedType.personnel_types_id, {
        name,
        type: personnelType,
        department: department.trim() || undefined,
        basicSalary: basic,
        isActive
      })
      
      if (!result.success) {
        toast.error(result.error || 'Failed to update')
        return
      }
      
      toast.success('Position updated')
      setEditOpen(false)
      resetForm()
      load()
    } catch {
      toast.error('Failed to update')
    }
  }

  async function deleteType(type: PersonnelType) {
    if (!confirm(`Are you sure you want to delete "${type.name}"?`)) return
    
    try {
      const result = await deletePersonnelType(type.personnel_types_id)
      
      if (!result.success) {
        toast.error(result.error || 'Failed to delete')
        return
      }
      
      toast.success('Position deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openEditDialog = (type: PersonnelType) => {
    setSelectedType(type)
    setName(type.name)
    setPersonnelType(type.type || 'NON_TEACHING')
    setDepartment(type.department || '')
    setBasicSalaryInput(type.basicSalary.toString())
    setIsActive(type.isActive)
    setEditOpen(true)
  }

  const openViewDialog = (type: PersonnelType) => {
    setSelectedType(type)
    setViewOpen(true)
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between rounded-md px-4 py-3 bg-transparent dark:bg-sidebar text-foreground dark:text-sidebar-foreground">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Position
          </h2>
          <p className="text-muted-foreground text-sm">Manage positions and configure salary structures</p>
        </div>
      <SSRSafe>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (isOpen) {
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2"/>Add New Position</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New Position</DialogTitle>
              <DialogDescription>Create a new position and view automatic salary calculations.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Input Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-base font-semibold">School Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full h-11 text-base">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDEPENDENT">Independent / Unassigned</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN COMPUTER SCIENCE">Bachelor of Science in Computer Science</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN CRIMINOLOGY">Bachelor of Science in Criminology</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN EDUCATION">Bachelor of Science in Education</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION">Bachelor of Science in Business Administration</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN SOCIAL WORK">Bachelor of Science in Social Work</SelectItem>
                      <SelectItem value="BACHELOR OF ARTS IN SOCIAL LANGUAGE STUDIES">Bachelor of Arts in Social Language Studies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position-name" className="text-base font-semibold">Position Name</Label>
                  <Input 
                    id="position-name"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Senior Developer, Manager, Accountant" 
                    className="w-full h-11 text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="personnel-type" className="text-base font-semibold">Personnel Type</Label>
                  <Select value={personnelType} onValueChange={setPersonnelType}>
                    <SelectTrigger className="w-full h-11 text-base">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEACHING">Teaching Personnel</SelectItem>
                      <SelectItem value="NON_TEACHING">Non-Teaching Personnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monthly-salary" className="text-base font-semibold">Monthly Salary (PHP)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">₱</span>
                    <Input 
                      id="monthly-salary"
                      value={basicSalaryInput} 
                      onChange={(e) => setBasicSalaryInput(e.target.value)} 
                      placeholder="25000 or 25k" 
                      className="w-full h-11 pl-8 text-base font-medium"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Tip: Use shorthand like 25k (25,000) or 1.5m (1,500,000)
                  </p>
                </div>
              </div>

              {/* Salary Breakdown Section */}
              {basic > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border"></div>
                    <h4 className="font-semibold text-base text-muted-foreground">Automatic Salary Breakdown</h4>
                    <div className="h-px flex-1 bg-border"></div>
                  </div>
                  
                  {/* Unified Salary Breakdown Card */}
                  <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 rounded-lg p-6 border border-green-200 dark:border-green-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Complete Salary Breakdown
                      </h5>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">₱{basic.toLocaleString()}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Semi-Monthly</span>
                          <span className="text-base font-semibold">₱{semiMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 2 (half month)</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Weekly</span>
                          <span className="text-base font-semibold">₱{weekly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 4 weeks</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Daily Rate</span>
                          <span className="text-base font-semibold">₱{daily.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ {workingDays} working days</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Hourly Rate</span>
                          <span className="text-base font-semibold">₱{hourly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 8 hours per day</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Per Minute</span>
                          <span className="text-base font-semibold">₱{min.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 60 minutes per hour</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Per Second</span>
                          <span className="text-base font-semibold">₱{sec.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 60 seconds per minute</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!basic && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Enter a monthly salary to see automatic breakdown</p>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={create} disabled={!name.trim() || !basicSalaryInput.trim()} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Create Position
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </SSRSafe>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(t => (
                  <TableRow key={t.personnel_types_id}>
                    <TableCell className="text-muted-foreground">{t.department || '-'}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'TEACHING' ? 'default' : 'secondary'} className="text-xs">
                        {t.type === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                      </Badge>
                    </TableCell>
                    <TableCell>₱{Number(t.basicSalary).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? 'default' : 'secondary'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <SSRSafe>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(t)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(t)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteType(t)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SSRSafe>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No positions yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SSRSafe>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Position</DialogTitle>
              <DialogDescription>Update position information and view automatic salary calculations.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Input Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-department" className="text-base font-semibold">School Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full h-11 text-base">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDEPENDENT">Independent / Unassigned</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN COMPUTER SCIENCE">Bachelor of Science in Computer Science</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN CRIMINOLOGY">Bachelor of Science in Criminology</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN EDUCATION">Bachelor of Science in Education</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION">Bachelor of Science in Business Administration</SelectItem>
                      <SelectItem value="BACHELOR OF SCIENCE IN SOCIAL WORK">Bachelor of Science in Social Work</SelectItem>
                      <SelectItem value="BACHELOR OF ARTS IN SOCIAL LANGUAGE STUDIES">Bachelor of Arts in Social Language Studies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-position-name" className="text-base font-semibold">Position Name</Label>
                  <Input 
                    id="edit-position-name"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Senior Developer, Manager, Accountant" 
                    className="w-full h-11 text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-personnel-type" className="text-base font-semibold">Personnel Type</Label>
                  <Select value={personnelType} onValueChange={setPersonnelType}>
                    <SelectTrigger className="w-full h-11 text-base">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEACHING">Teaching Personnel</SelectItem>
                      <SelectItem value="NON_TEACHING">Non-Teaching Personnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-monthly-salary" className="text-base font-semibold">Monthly Salary (PHP)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">₱</span>
                    <Input 
                      id="edit-monthly-salary"
                      value={basicSalaryInput} 
                      onChange={(e) => setBasicSalaryInput(e.target.value)} 
                      placeholder="25000 or 25k" 
                      className="w-full h-11 pl-8 text-base font-medium"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Tip: Use shorthand like 25k (25,000) or 1.5m (1,500,000)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Status</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded h-4 w-4"
                    />
                    <Label htmlFor="edit-isActive" className="text-sm font-normal">Active</Label>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown Section */}
              {basic > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border"></div>
                    <h4 className="font-semibold text-base text-muted-foreground">Automatic Salary Breakdown</h4>
                    <div className="h-px flex-1 bg-border"></div>
                  </div>
                  
                  {/* Unified Salary Breakdown Card */}
                  <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 rounded-lg p-6 border border-green-200 dark:border-green-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Complete Salary Breakdown
                      </h5>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">₱{basic.toLocaleString()}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Semi-Monthly</span>
                          <span className="text-base font-semibold">₱{semiMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 2 (half month)</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Weekly</span>
                          <span className="text-base font-semibold">₱{weekly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 4 weeks</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Daily Rate</span>
                          <span className="text-base font-semibold">₱{daily.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ {workingDays} working days</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Hourly Rate</span>
                          <span className="text-base font-semibold">₱{hourly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 8 hours per day</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Per Minute</span>
                          <span className="text-base font-semibold">₱{min.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 60 minutes per hour</p>
                      </div>
                      
                      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                          <span className="text-sm text-muted-foreground">Per Second</span>
                          <span className="text-base font-semibold">₱{sec.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">÷ 60 seconds per minute</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-900">
                      <p className="text-xs text-muted-foreground">
                        {attendanceSettings?.periodStart && attendanceSettings?.periodEnd 
                          ? `Period: ${new Date(attendanceSettings.periodStart).toLocaleDateString()} - ${new Date(attendanceSettings.periodEnd).toLocaleDateString()}`
                          : 'No attendance period set - using 22 working days default'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!basic && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Enter a monthly salary to see automatic breakdown</p>
                </div>
              )}
            </div>
            
            <DialogFooter className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={update} disabled={!name.trim() || !basicSalaryInput.trim()} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Update Position
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe>

      {/* View Dialog */}
      <SSRSafe>
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedType?.name}</DialogTitle>
              <DialogDescription>Complete position information and salary breakdown.</DialogDescription>
            </DialogHeader>
            {selectedType && (
              <div className="space-y-6 py-4">
                {/* Position Info Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedType.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={selectedType.type === 'TEACHING' ? 'default' : 'secondary'} className="text-xs">
                          {selectedType.type === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                        </Badge>
                        {selectedType.department && (
                          <span className="text-sm text-muted-foreground">• {selectedType.department}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={selectedType.isActive ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                      {selectedType.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Salary</p>
                      <p className="text-2xl font-bold text-green-600">₱{Number(selectedType.basicSalary).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created On</p>
                      <p className="text-sm font-medium">{new Date(selectedType.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown Card */}
                <div className="bg-muted/30 rounded-lg p-6 border">
                  <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Salary Breakdown
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Monthly</span>
                        <span className="font-semibold">₱{Number(selectedType.basicSalary).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Semi-Monthly</span>
                        <span className="font-semibold">₱{(Number(selectedType.basicSalary) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Weekly</span>
                        <span className="font-semibold">₱{(Number(selectedType.basicSalary) / 4).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Daily</span>
                        <span className="font-semibold">₱{(Number(selectedType.basicSalary) / (workingDays || 22)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Hourly</span>
                        <span className="font-semibold">₱{(Number(selectedType.basicSalary) / ((workingDays || 22) * 8)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Per Minute</span>
                        <span className="font-semibold">₱{(Number(selectedType.basicSalary) / ((workingDays || 22) * 8 * 60)).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Per Second</span>
                        <span className="font-semibold">₱{(Number(selectedType.basicSalary) / ((workingDays || 22) * 8 * 60 * 60)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-muted-foreground italic">Based on {workingDays || 22} working days</span>
                        <span className="text-xs text-muted-foreground">& 8hrs/day</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      * Daily and hourly rates based on {workingDays || 22} working days per month and 8 hours per day
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setViewOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe>
    </div>
  )
}


