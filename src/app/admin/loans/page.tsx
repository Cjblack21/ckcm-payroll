"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  Plus, 
  Eye, 
  DollarSign, 
  Calendar, 
  User, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Banknote,
  FileText
} from "lucide-react"
import { format } from "date-fns"

type LoanItem = {
  loans_id: string
  users_id: string
  userName: string | null
  userEmail: string
  amount: number
  balance: number
  monthlyPaymentPercent: number
  termMonths: number
  status: string
  createdAt: string
}

type UserOption = { users_id: string, name: string | null, email: string }

export default function LoansPage() {
  const [items, setItems] = useState<LoanItem[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [form, setForm] = useState({ users_id: "", amount: "", purpose: "", monthlyPaymentPercent: "", termMonths: "" })
  const [saving, setSaving] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    loadLoans()
  }, [])

  async function loadLoans() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/loans')
      const data = await res.json()
      setItems(data.items || [])
    } catch (e) {
      console.error('Error loading loans', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      const opts = (data.users || []).map((u: { users_id: string, name: string | null, email: string }) => ({ users_id: u.users_id, name: u.name, email: u.email }))
      setUsers(opts)
    } catch (e) {
      console.error('Error loading users:', e)
    }
  }

  async function viewLoanDetails(loan: LoanItem) {
    try {
      const res = await fetch(`/api/admin/loans/${loan.loans_id}`)
      const data = await res.json()
      setSelectedLoan(data)
      setDetailsOpen(true)
    } catch (e) {
      console.error('Error loading loan details:', e)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i =>
      (i.userName || '').toLowerCase().includes(q) ||
      i.userEmail.toLowerCase().includes(q)
    )
  }, [items, search])

  function initials(name: string | null, email: string) {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase()
    return email.split('@')[0].substring(0, 2).toUpperCase()
  }

  async function submitLoan() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users_id: form.users_id,
          amount: Number(form.amount),
          purpose: form.purpose,
          monthlyPaymentPercent: Number(form.monthlyPaymentPercent),
          termMonths: Number(form.termMonths),
        })
      })
      if (!res.ok) throw new Error('Failed to create loan')
      setOpen(false)
      setForm({ users_id: "", amount: "", purpose: "", monthlyPaymentPercent: "", termMonths: "" })
      await loadLoans()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Calculate statistics
  const totalLoans = items.length
  const activeLoans = items.filter(item => item.status === 'ACTIVE').length
  const completedLoans = items.filter(item => item.status === 'COMPLETED').length
  const totalLoanAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const totalOutstanding = items.reduce((sum, item) => sum + item.balance, 0)
  // Per payroll payment (system uses payroll periods rather than monthly)
  const totalPerPayrollPayments = items.reduce((sum, item) => {
    const monthlyPayment = item.amount * (item.monthlyPaymentPercent / 100)
    const perPayroll = monthlyPayment / 2
    return sum + perPayroll
  }, 0)

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Loan Management
          </h2>
          <p className="text-muted-foreground">Manage employee loans and track payments</p>
        </div>
        <Dialog open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen)
          if (newOpen) {
            loadUsers()
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add New Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Add New Loan
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Employee
                </label>
                <Select value={form.users_id} onValueChange={(value) => setForm(f => ({ ...f, users_id: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.users_id} value={u.users_id}>
                        {u.name || u.email} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Loan Amount
                  </label>
                  <Input 
                    type="number" 
                    min="0" 
                    value={form.amount} 
                    onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="Enter loan amount"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Monthly Payment (%)
                  </label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={form.monthlyPaymentPercent} 
                    onChange={(e) => setForm(f => ({ ...f, monthlyPaymentPercent: e.target.value }))}
                    placeholder="e.g., 2.0"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of loan amount to deduct monthly (e.g., 2% = ₱2,000 monthly on ₱100,000 loan)
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Loan Term (months)
                  </label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={form.termMonths} 
                    onChange={(e) => setForm(f => ({ ...f, termMonths: e.target.value }))}
                    placeholder="Enter loan term in months"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Loan Purpose
                  </label>
                  <Input 
                    value={form.purpose} 
                    onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
                    placeholder="e.g., Medical expenses, Emergency fund"
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Payment Preview Section */}
              {(form.amount && form.monthlyPaymentPercent) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-600">
                      <TrendingUp className="h-5 w-5" />
                      Payment Preview
                    </h3>
                    <p className="text-sm text-blue-700">
                      Real-time calculation based on your inputs. This shows exactly how much will be deducted from the employee&apos;s salary.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-blue-800">Monthly Payment Amount</label>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <span className="text-lg font-bold text-blue-900">
                              ₱{((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-blue-700">
                            {form.monthlyPaymentPercent}% of ₱{Number(form.amount).toLocaleString()} = ₱{Number(form.amount).toLocaleString()} × {form.monthlyPaymentPercent}% = ₱{((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-blue-800">Per Payroll Payment</label>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <span className="text-lg font-bold text-blue-900">
                              ₱{(((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-blue-700">
                            Monthly payment ÷ 2 (semi-monthly payroll)
                          </p>
                        </div>
                      </div>
                      {form.termMonths && (
                        <div className="pt-2 border-t border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-800">Total Interest-Free Amount</span>
                            <span className="text-sm font-semibold text-blue-900">₱{Number(form.amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-blue-800">Estimated Payoff Period</span>
                            <span className="text-sm font-semibold text-blue-900">{form.termMonths} months</span>
                          </div>
                          {Number(form.termMonths) > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-800">Estimated Monthly Collection</span>
                              <span className="text-sm font-semibold text-blue-900">
                                ₱{((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              <Separator />
              
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="hover:bg-gray-50 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={saving || !form.users_id || !form.amount || !form.termMonths} 
                  onClick={submitLoan}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                >
                  {saving ? 'Creating Loan...' : 'Create Loan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoans}</div>
            <p className="text-xs text-muted-foreground">
              {activeLoans} active, {completedLoans} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loan Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalLoanAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time loan disbursements
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Remaining to be paid
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Payroll Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalPerPayrollPayments.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Total per-payroll collection
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Active Loans</CardTitle>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or email..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full pl-10" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Profile</TableHead>
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Loan Amount</TableHead>
                <TableHead className="font-semibold">Balance</TableHead>
                <TableHead className="font-semibold">Per Payroll Payment</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date Applied</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(i => {
                const monthlyPayment = i.amount * (i.monthlyPaymentPercent / 100)
                const perPayrollPayment = monthlyPayment / 2
                return (
                  <TableRow key={i.loans_id}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">{initials(i.userName, i.userEmail)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{i.userName || i.userEmail}</TableCell>
                    <TableCell>{i.userEmail}</TableCell>
                    <TableCell>₱{i.amount.toLocaleString()}</TableCell>
                    <TableCell>₱{i.balance.toLocaleString()}</TableCell>
                    <TableCell>₱{perPayrollPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={i.status === 'ACTIVE' ? 'default' : i.status === 'COMPLETED' ? 'secondary' : 'destructive'}
                        className={
                          i.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          i.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                          'bg-red-100 text-red-800 hover:bg-red-200'
                        }
                      >
                        {i.status === 'ACTIVE' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {i.status === 'COMPLETED' && <Clock className="h-3 w-3 mr-1" />}
                        {i.status === 'DEFAULTED' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(i.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => viewLoanDetails(i)}
                        className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-muted p-3">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {isLoading ? 'Loading loans...' : 'No loans found'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isLoading ? 'Please wait while we fetch the data' : 'Try adjusting your search criteria or add a new loan'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Loan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-600" />
              Loan Details
            </DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-6">
              {/* Borrower Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Borrower Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm font-medium break-words">{selectedLoan.userName || selectedLoan.userEmail}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm break-words">{selectedLoan.userEmail}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Loan Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Loan Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Loan Amount</label>
                    <p className="text-lg font-bold text-green-600 break-words">₱{selectedLoan.amount.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Remaining Balance</label>
                    <p className="text-lg font-bold text-orange-600 break-words">₱{selectedLoan.balance.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Monthly Payment Rate</label>
                    <p className="text-sm font-semibold">{selectedLoan.monthlyPaymentPercent}%</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Term</label>
                    <p className="text-sm font-semibold">{selectedLoan.termMonths} months</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div>
                      <Badge 
                        variant={selectedLoan.status === 'ACTIVE' ? 'default' : selectedLoan.status === 'COMPLETED' ? 'secondary' : 'destructive'}
                        className={
                          selectedLoan.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          selectedLoan.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                          'bg-red-100 text-red-800 hover:bg-red-200'
                        }
                      >
                        {selectedLoan.status === 'ACTIVE' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {selectedLoan.status === 'COMPLETED' && <Clock className="h-3 w-3 mr-1" />}
                        {selectedLoan.status === 'DEFAULTED' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {selectedLoan.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Date Applied</label>
                    <p className="text-sm font-semibold">{format(new Date(selectedLoan.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Per Payroll Payment</label>
                    <p className="text-lg font-bold break-words">₱{((selectedLoan.amount * (selectedLoan.monthlyPaymentPercent / 100)) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
              {(selectedLoan as LoanItem & { purpose?: string }).purpose && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Additional Information
                    </h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Purpose</label>
                      <p className="text-sm bg-muted p-3 rounded-md">{(selectedLoan as LoanItem & { purpose?: string }).purpose}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                        <p className="text-sm font-semibold">{(selectedLoan as LoanItem & { startDate?: string }).startDate ? format(new Date((selectedLoan as LoanItem & { startDate?: string }).startDate!), 'MMM dd, yyyy') : 'N/A'}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">End Date</label>
                        <p className="text-sm font-semibold">{(selectedLoan as LoanItem & { endDate?: string }).endDate ? format(new Date((selectedLoan as LoanItem & { endDate?: string }).endDate!), 'MMM dd, yyyy') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDetailsOpen(false)}
                  className="hover:bg-gray-50 w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}