"use client"

import { useState, useEffect, useMemo } from "react"
import { Calendar, Plus, Eye, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "react-hot-toast"

type LeaveStatus = "PENDING" | "APPROVED" | "DENIED"
type LeaveType = "VACATION" | "FMLA" | "PARENTAL" | "SICK" | "UNPAID" | "PERSONAL" | "PUBLIC_HOLIDAY" | "RELIGIOUS" | "SABBATICAL" | "BEREAVEMENT" | "COMPENSATORY" | "CUSTOM"

type Leave = {
  leave_requests_id: string
  type: LeaveType
  customLeaveType?: string | null
  startDate: string
  endDate: string
  days: number
  isPaid: boolean
  reason: string | null
  status: LeaveStatus
  adminComment?: string | null
  createdAt: string
}

export default function PersonnelLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [filterType, setFilterType] = useState<LeaveType | "ALL">("ALL")

  // Form state
  const [formData, setFormData] = useState({
    type: "VACATION" as LeaveType,
    customLeaveType: "",
    startDate: "",
    endDate: "",
    isPaid: true,
    reason: "",
  })

  useEffect(() => {
    fetchLeaves()
  }, [])

  // Calculate days between dates
  const calculatedDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return isFinite(diff) && diff > 0 ? diff : 0
  }, [formData.startDate, formData.endDate])

  async function fetchLeaves() {
    try {
      setLoading(true)
      const response = await fetch("/api/personnel/leaves")

      if (!response.ok) {
        throw new Error("Failed to fetch leave requests")
      }

      const data = await response.json()
      
      // Transform dates
      const transformedData = data.map((item: any) => ({
        ...item,
        startDate: new Date(item.startDate).toISOString().split("T")[0],
        endDate: new Date(item.endDate).toISOString().split("T")[0],
      }))
      
      setLeaves(transformedData)
    } catch (error) {
      console.error("Error fetching leaves:", error)
      toast.error("Failed to load leave requests")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    // Validation
    if (!formData.startDate || !formData.endDate) {
      toast.error("Please select start and end dates")
      return
    }

    if (calculatedDays <= 0) {
      toast.error("End date must be after start date")
      return
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for your leave request")
      return
    }

    if (formData.type === "CUSTOM" && !formData.customLeaveType.trim()) {
      toast.error("Please specify custom leave type")
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/personnel/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          customLeaveType: formData.type === "CUSTOM" ? formData.customLeaveType : null,
          startDate: formData.startDate,
          endDate: formData.endDate,
          days: calculatedDays,
          isPaid: formData.isPaid,
          reason: formData.reason,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error Response:", errorData)
        console.error("Status:", response.status)
        throw new Error(errorData.error || "Failed to submit leave request")
      }

      toast.success("Leave request submitted successfully!")
      setFormOpen(false)
      resetForm()
      fetchLeaves()
    } catch (error) {
      console.error("Error submitting leave:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit leave request")
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormData({
      type: "VACATION",
      customLeaveType: "",
      startDate: "",
      endDate: "",
      isPaid: true,
      reason: "",
    })
  }

  function statusClass(s: LeaveStatus) {
    if (s === "APPROVED") return "bg-green-100 text-green-800"
    if (s === "DENIED") return "bg-red-100 text-red-800"
    return "bg-yellow-100 text-yellow-800"
  }

  function formatLeaveType(type: LeaveType, customType?: string | null) {
    if (type === "CUSTOM" && customType) return customType
    const formatted: Record<LeaveType, string> = {
      VACATION: "Vacation",
      FMLA: "FMLA",
      PARENTAL: "Parental",
      SICK: "Sick",
      UNPAID: "Unpaid",
      PERSONAL: "Personal",
      PUBLIC_HOLIDAY: "Public Holiday",
      RELIGIOUS: "Religious",
      SABBATICAL: "Sabbatical",
      BEREAVEMENT: "Bereavement",
      COMPENSATORY: "Compensatory",
      CUSTOM: "Custom",
    }
    return formatted[type] || type
  }

  function formatStatus(status: LeaveStatus) {
    return status.charAt(0) + status.slice(1).toLowerCase()
  }

  const pendingCount = leaves.filter(l => l.status === "PENDING").length
  const approvedCount = leaves.filter(l => l.status === "APPROVED").length
  
  // Filter leaves by type
  const filteredLeaves = filterType === "ALL" 
    ? leaves 
    : leaves.filter(l => l.type === filterType)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading leave requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            My Leave Requests
          </h1>
          <p className="text-gray-600">Submit and track your leave requests</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Leave
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{leaves.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leave History</CardTitle>
              <CardDescription>View all your submitted leave requests</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="filter" className="text-sm">Filter by:</Label>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as LeaveType | "ALL")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="VACATION">Vacation</SelectItem>
                  <SelectItem value="FMLA">FMLA</SelectItem>
                  <SelectItem value="PARENTAL">Parental</SelectItem>
                  <SelectItem value="SICK">Sick</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PERSONAL">Personal</SelectItem>
                  <SelectItem value="PUBLIC_HOLIDAY">Public Holiday</SelectItem>
                  <SelectItem value="RELIGIOUS">Religious</SelectItem>
                  <SelectItem value="SABBATICAL">Sabbatical</SelectItem>
                  <SelectItem value="BEREAVEMENT">Bereavement</SelectItem>
                  <SelectItem value="COMPENSATORY">Compensatory</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {leaves.length === 0 
                      ? "No leave requests yet. Click \"Request Leave\" to submit your first request."
                      : "No leave requests match the selected filter."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map((leave) => (
                  <TableRow key={leave.leave_requests_id}>
                    <TableCell>
                      <Badge variant="outline">{formatLeaveType(leave.type, leave.customLeaveType)}</Badge>
                    </TableCell>
                    <TableCell>{leave.startDate}</TableCell>
                    <TableCell>{leave.endDate}</TableCell>
                    <TableCell className="font-semibold">{leave.days}</TableCell>
                    <TableCell>
                      <Badge className={leave.isPaid ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>
                        {leave.isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusClass(leave.status)}>
                        {formatStatus(leave.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLeave(leave)
                          setViewDialogOpen(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request Leave Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Fill in the details below to submit your leave request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Leave Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as LeaveType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACATION">Vacation (Annual)</SelectItem>
                    <SelectItem value="FMLA">Family and Medical Leave (FMLA)</SelectItem>
                    <SelectItem value="PARENTAL">Parental Leave</SelectItem>
                    <SelectItem value="SICK">Sick Leave</SelectItem>
                    <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                    <SelectItem value="PERSONAL">Personal Leave</SelectItem>
                    <SelectItem value="PUBLIC_HOLIDAY">Public Holiday</SelectItem>
                    <SelectItem value="RELIGIOUS">Religious Observance</SelectItem>
                    <SelectItem value="SABBATICAL">Sabbatical Leave</SelectItem>
                    <SelectItem value="BEREAVEMENT">Bereavement Leave</SelectItem>
                    <SelectItem value="COMPENSATORY">Compensatory Leave</SelectItem>
                    <SelectItem value="CUSTOM">Custom Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={formData.isPaid ? "paid" : "unpaid"}
                  onValueChange={(value) => setFormData({ ...formData, isPaid: value === "paid" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === "CUSTOM" && (
              <div>
                <Label>Custom Leave Type Name</Label>
                <Input
                  placeholder="e.g., Study Leave, Jury Duty, etc."
                  value={formData.customLeaveType}
                  onChange={(e) => setFormData({ ...formData, customLeaveType: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label>Duration (Quick Select)</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const today = new Date()
                      const formatted = today.toISOString().split("T")[0]
                      setFormData({ ...formData, startDate: formatted, endDate: formatted })
                    }}
                  >
                    1 Day
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const start = new Date()
                      const end = new Date(start)
                      end.setDate(start.getDate() + 2)
                      setFormData({ 
                        ...formData, 
                        startDate: start.toISOString().split("T")[0], 
                        endDate: end.toISOString().split("T")[0] 
                      })
                    }}
                  >
                    3 Days
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const start = new Date()
                      const end = new Date(start)
                      end.setDate(start.getDate() + 4)
                      setFormData({ 
                        ...formData, 
                        startDate: start.toISOString().split("T")[0], 
                        endDate: end.toISOString().split("T")[0] 
                      })
                    }}
                  >
                    5 Days
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const start = new Date()
                      const end = new Date(start)
                      end.setDate(start.getDate() + 6)
                      setFormData({ 
                        ...formData, 
                        startDate: start.toISOString().split("T")[0], 
                        endDate: end.toISOString().split("T")[0] 
                      })
                    }}
                  >
                    7 Days
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const start = new Date()
                      const end = new Date(start)
                      end.setDate(start.getDate() + 13)
                      setFormData({ 
                        ...formData, 
                        startDate: start.toISOString().split("T")[0], 
                        endDate: end.toISOString().split("T")[0] 
                      })
                    }}
                  >
                    14 Days
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {calculatedDays > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Duration:</strong> {calculatedDays} day{calculatedDays !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            <div>
              <Label>Reason for Leave</Label>
              <Textarea
                placeholder="Please provide a reason for your leave request..."
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false)
                resetForm()
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Leave Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{formatLeaveType(selectedLeave.type, selectedLeave.customLeaveType)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusClass(selectedLeave.status)}>
                    {formatStatus(selectedLeave.status)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="font-medium">{selectedLeave.startDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="font-medium">{selectedLeave.endDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="font-medium">{selectedLeave.days} day(s)</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <Badge className={selectedLeave.isPaid ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>
                    {selectedLeave.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{new Date(selectedLeave.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="mt-1 text-sm">{selectedLeave.reason || "-"}</p>
              </div>
              {selectedLeave.adminComment && (
                <div>
                  <Label className="text-muted-foreground">Admin Comment</Label>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md">{selectedLeave.adminComment}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
