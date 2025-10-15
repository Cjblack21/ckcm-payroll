"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"
import { toast } from "react-hot-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type DeductionType = {
  deduction_types_id: string
  name: string
  description?: string | null
  amount: number
  isActive: boolean
}

type Employee = {
  employees_id: string
  firstName: string
  lastName: string
  email: string
}

type Deduction = {
  deductions_id: string
  amount: number
  notes?: string | null
  deductionType: DeductionType
  user: { users_id: string; name: string | null; email: string }
  createdAt: string
}

export default function DeductionsPage() {
  const [types, setTypes] = useState<DeductionType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [loading, setLoading] = useState(true)

  // Create Type dialog
  const [typeOpen, setTypeOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeDesc, setNewTypeDesc] = useState("")
  const [newTypeAmount, setNewTypeAmount] = useState("")

  // Edit Type dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTypeId, setEditTypeId] = useState<string>("")
  const [editTypeName, setEditTypeName] = useState("")
  const [editTypeDesc, setEditTypeDesc] = useState("")
  const [editTypeAmount, setEditTypeAmount] = useState("")
  const [editTypeActive, setEditTypeActive] = useState(true)

  // Create Deductions dialog
  const [deductionOpen, setDeductionOpen] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string>("")
  const [selectAll, setSelectAll] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [notes, setNotes] = useState<string>("")
  const [employeeSearch, setEmployeeSearch] = useState("")

  // Multi-entry support (Add Another deduction)
  const [entries, setEntries] = useState<{ key: string; typeId: string; notes: string; selectAll: boolean; employeeIds: string[] }[]>([])
  function addEntry() {
    setEntries(prev => [...prev, { key: crypto.randomUUID(), typeId: "", notes: "", selectAll: false, employeeIds: [] }])
  }
  function updateEntry(key: string, patch: Partial<{ typeId: string; notes: string; selectAll: boolean; employeeIds: string[] }>) {
    setEntries(prev => prev.map(e => e.key === key ? { ...e, ...patch } : e))
  }
  function removeEntry(key: string) { setEntries(prev => prev.filter(e => e.key !== key)) }

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees
    const q = employeeSearch.toLowerCase()
    return employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
  }, [employees, employeeSearch])

  async function loadAll() {
    try {
      setLoading(true)
      const [t, d] = await Promise.all([
        fetch("/api/admin/deduction-types").then(r => r.json()),
        fetch("/api/admin/deductions").then(r => r.json()),
      ])
      setTypes(t)
      setDeductions(d)
    } catch (e) {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Load employees when Add Deduction opens (so list is populated)
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/admin/employees")
        if (!res.ok) return
        const data = await res.json()
        setEmployees(data)
      } catch {}
    }
    if (deductionOpen) {
      loadEmployees()
    }
  }, [deductionOpen])

  async function createType() {
    try {
      const res = await fetch("/api/admin/deduction-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTypeName, description: newTypeDesc, amount: Number(newTypeAmount) }) })
      if (!res.ok) throw new Error()
      toast.success("Deduction type created")
      setTypeOpen(false)
      setNewTypeName("")
      setNewTypeDesc("")
      setNewTypeAmount("")
      loadAll()
    } catch {
      toast.error("Failed to create type")
    }
  }

  function openEdit(t: DeductionType) {
    setEditTypeId(t.deduction_types_id)
    setEditTypeName(t.name)
    setEditTypeDesc(t.description || "")
    setEditTypeAmount(t.amount.toString())
    setEditTypeActive(t.isActive)
    setEditOpen(true)
  }

  async function updateType() {
    try {
      const res = await fetch(`/api/admin/deduction-types/${editTypeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTypeName, description: editTypeDesc, amount: Number(editTypeAmount), isActive: editTypeActive })
      })
      if (!res.ok) throw new Error()
      toast.success("Deduction type updated")
      setEditOpen(false)
      loadAll()
    } catch {
      toast.error("Failed to update type")
    }
  }

  async function deleteType(id: string) {
    if (!confirm("Delete this deduction type? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/admin/deduction-types/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Deduction type deleted")
      loadAll()
    } catch {
      toast.error("Failed to delete type")
    }
  }

  async function deleteDeduction(id: string) {
    if (!confirm("Remove this deduction from the user? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/admin/deductions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Deduction removed")
      loadAll()
    } catch {
      toast.error("Failed to remove deduction")
    }
  }

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function saveDeductions() {
    try {
      // Build entries array - include both main form data and additional entries
      const allEntries = []
      
      // Add main form data if it has a selected type
      if (selectedTypeId) {
        allEntries.push({
          deduction_types_id: selectedTypeId,
          notes: notes,
          selectAll: selectAll,
          employees: selectedEmployeeIds
        })
      }
      
      // Add additional entries
      if (entries.length > 0) {
        entries.forEach(entry => {
          if (entry.typeId) { // Only add if type is selected
            allEntries.push({
              deduction_types_id: entry.typeId,
              notes: entry.notes,
              selectAll: entry.selectAll,
              employees: entry.employeeIds
            })
          }
        })
      }
      
      // Validate that we have at least one entry
      if (allEntries.length === 0) {
        toast.error("Please select at least one deduction type")
        return
      }
      
      // Create payload
      const payload = allEntries.length === 1 
        ? allEntries[0] // Single entry format
        : { entries: allEntries } // Multiple entries format
      
      console.log('Saving deductions with payload:', payload)
      
      const res = await fetch("/api/admin/deductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save deductions')
      }
      toast.success(`Deductions saved successfully (${allEntries.length} entries)`)
      setDeductionOpen(false)
      setSelectedTypeId("")
      setNotes("")
      setSelectAll(false)
      setSelectedEmployeeIds([])
      setEntries([]) // Clear entries when dialog closes
      loadAll()
    } catch (error) {
      console.error('Error saving deductions:', error)
      toast.error(error.message || "Failed to save deductions")
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between rounded-md px-4 py-3 bg-transparent dark:bg-sidebar text-foreground dark:text-sidebar-foreground">
        <h2 className="text-3xl font-bold tracking-tight">Add Deductions</h2>
        <div className="flex gap-2">
          <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Deduction Type</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Deduction Type</DialogTitle>
                <DialogDescription>Create a new type of deduction.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Late Penalty" />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} placeholder="Optional description" />
                </div>
                <div className="grid gap-2">
                  <Label>Amount</Label>
                  <Input type="number" value={newTypeAmount} onChange={e => setNewTypeAmount(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTypeOpen(false)}>Cancel</Button>
                <Button onClick={createType}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deductionOpen} onOpenChange={(open) => {
            setDeductionOpen(open)
            if (!open) {
              // Reset all state when dialog closes
              setSelectedTypeId("")
              setNotes("")
              setSelectAll(false)
              setSelectedEmployeeIds([])
              setEntries([])
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Deduction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Deduction</DialogTitle>
                <DialogDescription>Create deductions for selected employees.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Deduction Type</Label>
                  <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map(t => (
                        <SelectItem key={t.deduction_types_id} value={t.deduction_types_id}>{t.name} (₱{t.amount.toLocaleString()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center justify-between">Select All Employees
                    <Switch checked={selectAll} onCheckedChange={(v) => { setSelectAll(v); if (v) setSelectedEmployeeIds([]) }} />
                  </Label>
                </div>
                <div className="md:col-span-2 grid gap-2">
                  <Label>Employees</Label>
                  <div className="border rounded-md">
                    <Command>
                      <CommandInput placeholder="Search employees..." value={employeeSearch} onValueChange={setEmployeeSearch} />
                      <CommandList>
                        <CommandEmpty>No employees found.</CommandEmpty>
                        <CommandGroup>
                          {filteredEmployees.map(e => {
                            const sel = selectedEmployeeIds.includes(e.employees_id)
                            return (
                              <CommandItem key={e.employees_id} disabled={selectAll} onSelect={() => toggleEmployee(e.employees_id)}>
                                <div className={`flex w-full items-center justify-between ${selectAll ? 'opacity-50' : ''}`}>
                                  <span>{e.firstName} {e.lastName} — {e.email}</span>
                                  <span className={`text-xs ${sel ? 'text-green-600' : 'text-muted-foreground'}`}>{sel ? 'Selected' : 'Click to select'}</span>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                  {!selectAll && selectedEmployeeIds.length > 0 && (
                    <div className="text-sm text-muted-foreground">Selected: {selectedEmployeeIds.length} employee(s)</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Button variant="outline" onClick={addEntry}><Plus className="h-4 w-4 mr-2" />Add Another deduction</Button>
                </div>
              </div>

              {entries.length > 0 && (
                <div className="space-y-4 border-t pt-4 mt-2">
                  {entries.map(row => (
                    <div key={row.key} className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Deduction Type</Label>
                        <Select value={row.typeId} onValueChange={(v) => updateEntry(row.key, { typeId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {types.map(t => (
                              <SelectItem key={t.deduction_types_id} value={t.deduction_types_id}>{t.name} (₱{t.amount.toLocaleString()})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Notes</Label>
                        <Input value={row.notes} onChange={e => updateEntry(row.key, { notes: e.target.value })} placeholder="Optional notes" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="flex items-center justify-between">Select All Employees
                          <Switch checked={row.selectAll} onCheckedChange={(v) => updateEntry(row.key, { selectAll: v, employeeIds: v ? [] : row.employeeIds })} />
                        </Label>
                      </div>
                      <div className="md:col-span-2 grid gap-2">
                        <Label>Employees</Label>
                        <div className="border rounded-md">
                          <Command>
                            <CommandInput placeholder="Search employees..." value={employeeSearch} onValueChange={setEmployeeSearch} />
                            <CommandList>
                              <CommandEmpty>No employees found.</CommandEmpty>
                              <CommandGroup>
                                {filteredEmployees.map(e => {
                                  const sel = row.employeeIds.includes(e.employees_id)
                                  return (
                                    <CommandItem key={e.employees_id} disabled={row.selectAll} onSelect={() => {
                                      const next = sel ? row.employeeIds.filter(x => x !== e.employees_id) : [...row.employeeIds, e.employees_id]
                                      updateEntry(row.key, { employeeIds: next })
                                    }}>
                                      <div className={`flex w-full items-center justify-between ${row.selectAll ? 'opacity-50' : ''}`}>
                                        <span>{e.firstName} {e.lastName} — {e.email}</span>
                                        <span className={`text-xs ${sel ? 'text-green-600' : 'text-muted-foreground'}`}>{sel ? 'Selected' : 'Click to select'}</span>
                                      </div>
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </div>
                        {!row.selectAll && row.employeeIds.length > 0 && (
                          <div className="text-sm text-muted-foreground">Selected: {row.employeeIds.length} employee(s)</div>
                        )}
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button variant="outline" onClick={() => removeEntry(row.key)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setDeductionOpen(false)
                  // Reset all state when canceling
                  setSelectedTypeId("")
                  setNotes("")
                  setSelectAll(false)
                  setSelectedEmployeeIds([])
                  setEntries([])
                }}>Cancel</Button>
                <Button onClick={saveDeductions}>Save Deductions</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deduction Types</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(t => (
                  <TableRow key={t.deduction_types_id}>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.description || '-'}</TableCell>
                    <TableCell>₱{t.amount.toLocaleString()}</TableCell>
                    <TableCell>{t.isActive ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteType(t.deduction_types_id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {types.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No deduction types yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Deductions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Deduction Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.map(d => (
                  <TableRow key={d.deductions_id}>
                    <TableCell>{d.user.name || d.user.email}</TableCell>
                    <TableCell>{d.deductionType.name}</TableCell>
                    <TableCell>₱{d.amount.toLocaleString()}</TableCell>
                    <TableCell>{d.notes || '-'}</TableCell>
                    <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteDeduction(d.deductions_id)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {deductions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No deductions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Type Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deduction Type</DialogTitle>
            <DialogDescription>Update name, description and status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={editTypeName} onChange={e => setEditTypeName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={editTypeDesc} onChange={e => setEditTypeDesc(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input type="number" value={editTypeAmount} onChange={e => setEditTypeAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center justify-between">Active
                <Switch checked={editTypeActive} onCheckedChange={setEditTypeActive} />
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={updateType}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


