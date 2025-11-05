"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Banknote, TrendingUp, Calendar, FileText, Clock, CheckCircle, AlertCircle, CreditCard as DeductionIcon, Archive } from 'lucide-react'
import { format } from 'date-fns'

interface LoanData {
  loans: any[]
  summary: {
    totalLoans: number
    activeLoans: number
    completedLoans: number
    totalActiveLoanAmount: number
    totalMonthlyPayments: number
    totalBiweeklyPayments: number
    totalRemainingBalance: number
  }
  paymentHistory: any[]
}

export default function PersonnelLoansPage() {
  const [data, setData] = useState<LoanData | null>(null)
  const [archivedLoans, setArchivedLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    loadLoansData()
    loadArchivedLoans()
  }, [])

  const loadLoansData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/personnel/loans')
      
      if (response.ok) {
        const loansData = await response.json()
        setData(loansData)
      } else {
        console.error('Failed to load loans data')
      }
    } catch (error) {
      console.error('Error loading loans data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadArchivedLoans = async () => {
    try {
      const response = await fetch('/api/personnel/loans?archived=true')
      
      if (response.ok) {
        const data = await response.json()
        setArchivedLoans(data.loans || [])
      } else {
        console.error('Failed to load archived loans')
      }
    } catch (error) {
      console.error('Error loading archived loans:', error)
    }
  }

  const viewDetails = (loan: any) => {
    setSelectedLoan(loan)
    setDetailsOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />
      case 'CANCELLED':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading loans data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Failed to load loans data</p>
          <Button onClick={loadLoansData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const { loans, summary, paymentHistory } = data

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Banknote className="h-8 w-8 text-blue-600" />
            My Loans & Deductions
          </h1>
          <p className="text-muted-foreground">View your loans, deductions and payment progress</p>
        </div>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-4 w-4 mr-2" />
          {showArchived ? 'Active Loans & Deductions' : 'Archived Loans & Deductions'}
        </Button>
      </div>

      {/* Loan Statistics */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Banknote className="h-5 w-5 text-blue-600" />
          Loan Statistics
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').length}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loan Amount</CardTitle>
            <span className="text-2xl font-bold text-blue-600">₱</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.loanAmount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Active loan amount
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.remainingBalance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Remaining to be paid
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Payroll Payments</CardTitle>
            <DeductionIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + (l.biweeklyPayment || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total per-payroll collection
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Completed Loans
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'COMPLETED').length + 
               archivedLoans.filter(l => !l.purpose?.startsWith('[DEDUCTION]')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deduction Statistics */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DeductionIcon className="h-5 w-5 text-red-600" />
          Deduction Statistics
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deductions</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').length}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deduction Amount</CardTitle>
            <span className="text-2xl font-bold text-red-600">₱</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.loanAmount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Active deduction amount
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.remainingBalance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Remaining to be paid
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Payroll Deductions</CardTitle>
            <DeductionIcon className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + (l.biweeklyPayment || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total per-payroll deductions
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500 relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
              </span>
              Completed Deductions
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'COMPLETED').length + 
               archivedLoans.filter(l => l.purpose?.startsWith('[DEDUCTION]')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Loans */}
      {!showArchived && summary.activeLoans > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Active Loans
            </CardTitle>
            <CardDescription>
              Your currently active loans and payment progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loans.filter(loan => loan.status === 'ACTIVE').map((loan) => {
                const isDeduction = loan.purpose?.startsWith('[DEDUCTION]')
                const displayPurpose = isDeduction ? loan.purpose.replace('[DEDUCTION] ', '') : loan.purpose
                return (
                <div key={loan.loans_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isDeduction ? (
                          <DeductionIcon className="h-4 w-4 text-red-600" />
                        ) : (
                          <Banknote className="h-4 w-4 text-blue-600" />
                        )}
                        <h3 className="font-medium text-lg">{displayPurpose}</h3>
                        <Badge variant="outline" className={isDeduction ? 'bg-red-50 text-red-700 border-red-200 text-xs' : 'bg-blue-50 text-blue-700 border-blue-200 text-xs'}>
                          {isDeduction ? 'Deduction' : 'Loan'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Date: {formatDate(loan.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(loan.status)}>
                        {getStatusIcon(loan.status)}
                        <span className="ml-1">{loan.status}</span>
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDetails(loan)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Original Amount</p>
                      <p className="font-bold text-blue-600">{formatCurrency(loan.loanAmount)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Monthly Payment</p>
                      <p className="font-bold text-green-600">{formatCurrency(loan.monthlyPayment)}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Per Payroll Deduction</p>
                      <p className="font-bold text-purple-600">{formatCurrency(loan.biweeklyPayment || 0)}</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">Remaining Balance</p>
                      <p className="font-bold text-red-600">{formatCurrency(loan.remainingBalance)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Payment Progress</span>
                      <span>{loan.progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={loan.progressPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Paid: {formatCurrency(loan.totalPaymentsMade)}</span>
                      <span>Remaining: {loan.paymentsRemaining} payments</span>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archived Loans */}
      {showArchived && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archived Loans & Deductions
            </CardTitle>
            <CardDescription>
              Your archived and completed loans
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archivedLoans.length > 0 ? (
              <div className="space-y-4">
                {archivedLoans.map((loan) => {
                  const isDeduction = loan.purpose?.startsWith('[DEDUCTION]')
                  const displayPurpose = isDeduction ? loan.purpose.replace('[DEDUCTION] ', '') : loan.purpose
                  return (
                    <div key={loan.loans_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isDeduction ? (
                              <DeductionIcon className="h-4 w-4 text-red-600" />
                            ) : (
                              <Banknote className="h-4 w-4 text-blue-600" />
                            )}
                            <h3 className="font-medium">{displayPurpose}</h3>
                            <Badge variant="outline" className={isDeduction ? 'bg-red-50 text-red-700 border-red-200 text-xs' : 'bg-blue-50 text-blue-700 border-blue-200 text-xs'}>
                              {isDeduction ? 'Deduction' : 'Loan'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Amount: {formatCurrency(loan.amount)} | Balance: {formatCurrency(loan.balance)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Created: {formatDate(loan.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(loan.status)}>
                            {getStatusIcon(loan.status)}
                            <span className="ml-1">{loan.status}</span>
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewDetails(loan)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Archived Items</h3>
                <p className="text-gray-600">
                  You don't have any archived loans or deductions.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Loans Message */}
      {!showArchived && summary.totalLoans === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Banknote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Loans or Deductions Found</h3>
            <p className="text-gray-600">
              You don't have any loans or deductions at this time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-600" />
              Loan & Deduction Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about your loan or deduction
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-6">
              {/* Loan Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="md:col-span-2 border-b border-border pb-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {selectedLoan.purpose?.startsWith('[DEDUCTION]') ? 'Deduction Purpose' : 'Loan Purpose'}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {selectedLoan.purpose?.startsWith('[DEDUCTION]') 
                        ? (selectedLoan.purpose.replace('[DEDUCTION] ', '') || 'Not specified') 
                        : (selectedLoan.purpose || 'Not specified')}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(selectedLoan.status)}>
                    {getStatusIcon(selectedLoan.status)}
                    <span className="ml-1">{selectedLoan.status}</span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Loan Date</p>
                  <p className="font-medium">{formatDate(selectedLoan.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Term</p>
                  <p className="font-medium">{selectedLoan.termMonths} months</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h4 className="font-medium mb-3">Financial Breakdown</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Original Loan Amount</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedLoan.loanAmount)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Monthly Payment</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedLoan.monthlyPayment)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Per Payroll Deduction</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedLoan.biweeklyPayment)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Payments Made</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(selectedLoan.totalPaymentsMade)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-medium">
                      <TableCell>Remaining Balance</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(selectedLoan.remainingBalance)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Progress Information */}
              <div>
                <h4 className="font-medium mb-3">Payment Progress</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{selectedLoan.progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={selectedLoan.progressPercentage} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Payments Remaining</p>
                      <p className="font-bold text-blue-600 dark:text-blue-400">{selectedLoan.paymentsRemaining}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Completion</p>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {formatDate(selectedLoan.estimatedCompletionDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

















