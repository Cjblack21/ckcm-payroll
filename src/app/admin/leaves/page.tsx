"use client"

import { useEffect, useState } from "react"
import { Calendar, CheckCircle, XCircle, Eye, Trash2, History, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"

type LeaveStatus = "PENDING" | "APPROVED" | "DENIED"
type LeaveType = "ANNUAL" | "SICK" | "UNPAID"

type Leave = {
  leave_requests_id: string
  users_id: string
  empName: string
  empId: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  isPaid: boolean
  reason: string | null
  status: LeaveStatus
  admin_id?: string | null
  adminComment?: string | null
  createdAt: string
  updatedAt: string
  user?: {
    users_id: string
    name: string
    email: string
  }
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)
  const [adminComment, setAdminComment] = useState("")
  const [processing, setProcessing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Fetch leave requests from API
  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  async function fetchLeaveRequests() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/leave-requests")
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || "Failed to fetch leave requests")
      }
      
      const data = await response.json()
      
      // Transform the data to match our Leave type
      const transformedData: Leave[] = data.map((item: any) => ({
        ...item,
        empName: item.user?.name || "Unknown",
        empId: item.users_id,
        startDate: new Date(item.startDate).toISOString().split("T")[0],
        endDate: new Date(item.endDate).toISOString().split("T")[0],
      }))
      
      setLeaves(transformedData)
    } catch (error) {
      console.error("Error fetching leave requests:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load leave requests"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!selectedLeave) return
    
    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/leave-requests/${selectedLeave.leave_requests_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "APPROVE",
          comment: adminComment || undefined
        }),
      })
      
      if (!response.ok) throw new Error("Failed to approve leave")
      
      toast.success("Leave request approved successfully")
      setApproveDialogOpen(false)
      setAdminComment("")
      setSelectedLeave(null)
      fetchLeaveRequests() // Refresh the list
    } catch (error) {
      console.error("Error approving leave:", error)
      toast.error("Failed to approve leave request")
    } finally {
      setProcessing(false)
    }
  }
  
  async function handleReject() {
    if (!selectedLeave) return
    
    try {
      setProcessing(true)
      const response = await fetch(`/api/admin/leave-requests/${selectedLeave.leave_requests_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "DENY",
          comment: adminComment || undefined
        }),
      })
      
      if (!response.ok) throw new Error("Failed to reject leave")
      
      toast.success("Leave request rejected")
      setRejectDialogOpen(false)
      setAdminComment("")
      setSelectedLeave(null)
      fetchLeaveRequests() // Refresh the list
    } catch (error) {
      console.error("Error rejecting leave:", error)
      toast.error("Failed to reject leave request")
    } finally {
      setProcessing(false)
    }
  }

  function statusClass(s: LeaveStatus) {
    if (s === "APPROVED") return "bg-green-100 text-green-800"
    if (s === "DENIED") return "bg-red-100 text-red-800"
    return "bg-yellow-100 text-yellow-800"
  }

  function formatLeaveType(type: LeaveType) {
    return type.charAt(0) + type.slice(1).toLowerCase()
  }

  function formatStatus(status: LeaveStatus) {
    return status.charAt(0) + status.slice(1).toLowerCase()
  }

  const pendingLeaves = leaves.filter(l => l.status === "PENDING")
  const processedLeaves = leaves.filter(l => l.status !== "PENDING")

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-8 w-8" /> Leave Management
        </h2>
        <p className="text-muted-foreground">Review and approve leave requests</p>
      </div>

      {/* Pending Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-600 font-semibold">Error loading leave requests</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <Button onClick={fetchLeaveRequests} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No pending leave requests
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingLeaves.map((leave) => (
                    <TableRow key={leave.leave_requests_id}>
                      <TableCell className="font-medium">{leave.empName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatLeaveType(leave.type)}</Badge>
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLeave(leave)
                              setViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedLeave(leave)
                              setApproveDialogOpen(true)
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedLeave(leave)
                              setRejectDialogOpen(true)
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Leave Requests History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Leave History
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2"
          >
            {showHistory ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide History
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show History ({processedLeaves.length})
              </>
            )}
          </Button>
        </CardHeader>
        {showHistory && (
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-600 font-semibold">Error loading leave requests</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <Button onClick={fetchLeaveRequests} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
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
                {processedLeaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No processed leave requests
                    </TableCell>
                  </TableRow>
                ) : (
                  processedLeaves.map((leave) => (
                    <TableRow key={leave.leave_requests_id}>
                      <TableCell className="font-medium">{leave.empName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatLeaveType(leave.type)}</Badge>
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLeave(leave)
                              setViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete this leave request from ${leave.empName}?`)) {
                                try {
                                  const response = await fetch(`/api/leave-requests/${leave.leave_requests_id}`, {
                                    method: "DELETE"
                                  })
                                  if (response.ok) {
                                    toast.success("Leave request deleted successfully")
                                    fetchLeaveRequests()
                                  } else {
                                    const error = await response.json()
                                    toast.error(error.error || "Failed to delete leave request")
                                  }
                                } catch (error) {
                                  console.error("Error deleting leave:", error)
                                  toast.error("Failed to delete leave request")
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        )}
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="font-medium">{selectedLeave.empName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{formatLeaveType(selectedLeave.type)}</p>
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
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusClass(selectedLeave.status)}>
                    {formatStatus(selectedLeave.status)}
                  </Badge>
                </div>
                <div>
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
                  <p className="mt-1 text-sm">{selectedLeave.adminComment}</p>
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

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this leave request for {selectedLeave?.empName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Comment (Optional)</Label>
              <Textarea
                placeholder="Add a comment..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setApproveDialogOpen(false)
              setAdminComment("")
            }} disabled={processing}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this leave request for {selectedLeave?.empName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Rejection (Optional)</Label>
              <Textarea
                placeholder="Explain why this request is being rejected..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false)
              setAdminComment("")
            }} disabled={processing}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
