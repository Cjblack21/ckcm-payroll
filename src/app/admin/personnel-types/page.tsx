"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
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
  const [basicSalaryInput, setBasicSalaryInput] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [attendanceSettings, setAttendanceSettings] = useState<any>(null)
  const [workingDays, setWorkingDays] = useState(22) // Default fallback

  const basic = useMemo(() => parseSalary(basicSalaryInput), [basicSalaryInput])
  const daily = useMemo(() => basic / workingDays, [basic, workingDays]) // Daily based on actual working days in period
  const hourly = useMemo(() => daily / 8, [daily])
  const min = useMemo(() => hourly / 60, [hourly])
  const sec = useMemo(() => min / 60, [min])

  async function load() {
    try {
      setLoading(true)
      
      // Load personnel types
      const result = await getPersonnelTypes()
      
      if (!result.success) {
        toast.error(result.error || 'Failed to load types')
        return
      }
      
      // Transform server data to match local type
      const transformedTypes: PersonnelType[] = (result.personnelTypes || []).map((type: ServerPersonnelType) => ({
        personnel_types_id: type.personnel_types_id,
        name: type.name,
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
          
          setWorkingDays(days)
        }
      }
    } catch (error) {
      console.error('Error loading attendance settings:', error)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setName('')
    setBasicSalaryInput('')
    setIsActive(true)
    setSelectedType(null)
  }

  async function create() {
    try {
      const result = await createPersonnelType({
        name,
        basicSalary: basic,
        isActive
      })
      
      if (!result.success) {
        toast.error(result.error || 'Failed to add')
        return
      }
      
      toast.success('Personnel type added')
      setOpen(false)
      resetForm()
      load()
    } catch {
      toast.error('Failed to add')
    }
  }

  async function update() {
    if (!selectedType) return
    
    try {
      const result = await updatePersonnelType(selectedType.personnel_types_id, {
        name,
        basicSalary: basic,
        isActive
      })
      
      if (!result.success) {
        toast.error(result.error || 'Failed to update')
        return
      }
      
      toast.success('Personnel type updated')
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
      
      toast.success('Personnel type deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openEditDialog = (type: PersonnelType) => {
    setSelectedType(type)
    setName(type.name)
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
        <h2 className="text-3xl font-bold tracking-tight">Personnel Types</h2>
        <SSRSafe>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2"/>Add New Personnel Type</Button>
            </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Personnel Type</DialogTitle>
              <DialogDescription>Define a personnel type and net pay.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label>Personnel type name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Developer" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Net Pay per Month (PHP)</Label>
                <Input value={basicSalaryInput} onChange={(e) => setBasicSalaryInput(e.target.value)} placeholder="e.g. 25k or 25000" />
                <div className="text-sm text-muted-foreground">Basic salary for attendance period. Supports shorthand: 25k = 25,000; 1.5m = 1,500,000</div>
              </div>
              <div className="md:col-span-2 grid gap-2 rounded-md border p-3">
                <div className="font-medium">Calculated breakdown (Based on {workingDays} working days in attendance period)</div>
                <div className="grid md:grid-cols-3 gap-2 text-sm">
                  <div>Period Total: ₱{basic.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div>Daily Rate (÷{workingDays}): ₱{daily.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div>Hourly Rate (÷8): ₱{hourly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div>Per Minute: ₱{min.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div>Per Second: ₱{sec.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                  <div className="text-xs text-muted-foreground">
                    {attendanceSettings?.periodStart && attendanceSettings?.periodEnd 
                      ? `Period: ${new Date(attendanceSettings.periodStart).toLocaleDateString()} - ${new Date(attendanceSettings.periodEnd).toLocaleDateString()}`
                      : 'No attendance period set - using 22 working days default'
                    }
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={create}>Save</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </SSRSafe>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Personnel Types</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(t => (
                  <TableRow key={t.personnel_types_id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
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
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No personnel types yet.</TableCell>
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
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Personnel Type</DialogTitle>
              <DialogDescription>Update personnel type information and net pay.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label>Personnel type name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Developer" />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Net Pay per Month (PHP)</Label>
                <Input value={basicSalaryInput} onChange={(e) => setBasicSalaryInput(e.target.value)} placeholder="e.g. 25k or 25000" />
                <div className="text-sm text-muted-foreground">Monthly net pay (will be divided by 2 for biweekly payroll). Supports shorthand: 25k = 25,000; 1.5m = 1,500,000</div>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              <div className="md:col-span-2 grid gap-2 rounded-md border p-3">
                <div className="font-medium">Calculated breakdown (Based on {workingDays} working days in attendance period)</div>
                <div className="grid md:grid-cols-3 gap-2 text-sm">
                  <div>Period Total: ₱{basic.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div>Daily Rate (÷{workingDays}): ₱{daily.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div>Hourly Rate (÷8): ₱{hourly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  <div>Per Minute: ₱{min.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div>Per Second: ₱{sec.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                  <div className="text-xs text-muted-foreground">
                    {attendanceSettings?.periodStart && attendanceSettings?.periodEnd 
                      ? `Period: ${new Date(attendanceSettings.periodStart).toLocaleDateString()} - ${new Date(attendanceSettings.periodEnd).toLocaleDateString()}`
                      : 'No attendance period set - using 22 working days default'
                    }
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={update}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe>

      {/* View Dialog */}
      <SSRSafe>
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Personnel Type Details</DialogTitle>
              <DialogDescription>View detailed information about this personnel type.</DialogDescription>
            </DialogHeader>
            {selectedType && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <div className="text-sm font-medium">{selectedType.name}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Monthly Net Pay</Label>
                  <div className="text-sm font-medium">₱{Number(selectedType.basicSalary).toLocaleString()}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Badge variant={selectedType.isActive ? 'default' : 'secondary'}>
                    {selectedType.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="grid gap-2">
                  <Label>Created</Label>
                  <div className="text-sm">{new Date(selectedType.createdAt).toLocaleString()}</div>
                </div>
                <div className="grid gap-2 rounded-md border p-3">
                  <div className="font-medium">Salary Breakdown</div>
                  <div className="grid gap-1 text-sm">
                    <div>Biweekly: ₱{(Number(selectedType.basicSalary) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div>Weekly: ₱{(Number(selectedType.basicSalary) / 4).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div>Daily: ₱{(Number(selectedType.basicSalary) / 20).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div>Hourly: ₱{(Number(selectedType.basicSalary) / 160).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe>
    </div>
  )
}


