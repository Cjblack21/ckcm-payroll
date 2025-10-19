"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreditCard, TrendingUp, Calendar, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)

  useEffect(() => {
    loadLoansData()
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Loans</h1>
          <p className="text-gray-600">View your loan information and payment progress</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Loans</p>
                <p className="text-2xl font-bold">{summary.totalLoans}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold text-blue-600">{summary.activeLoans}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalActiveLoanAmount)}</p>
              </div>
              <span className="text-4xl font-bold text-purple-600">₱</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Remaining Balance</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalRemainingBalance)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Loans */}
      {summary.activeLoans > 0 && (
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
              {loans.filter(loan => loan.status === 'ACTIVE').map((loan) => (
                <div key={loan.loans_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{loan.purpose}</h3>
                      <p className="text-sm text-gray-600">
                        Loan Date: {formatDate(loan.createdAt)}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Original Amount</p>
                      <p className="font-bold text-blue-600">{formatCurrency(loan.loanAmount)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Monthly Payment</p>
                      <p className="font-bold text-green-600">{formatCurrency(loan.monthlyPayment)}</p>
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Loans */}
      {summary.completedLoans > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Completed Loans
            </CardTitle>
            <CardDescription>
              Your successfully completed loans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loans.filter(loan => loan.status === 'COMPLETED').map((loan) => (
                <div key={loan.loans_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{loan.purpose}</h3>
                      <p className="text-sm text-gray-600">
                        Completed: {formatDate(loan.updatedAt)}
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Loans Message */}
      {summary.totalLoans === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Loans Found</h3>
            <p className="text-gray-600">
              You don't have any loans at this time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>
              Detailed information about your loan
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-6">
              {/* Loan Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Loan Purpose</p>
                  <p className="font-medium">{selectedLoan.purpose}</p>
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
                      <TableCell>Biweekly Payment</TableCell>
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
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Payments Remaining</p>
                      <p className="font-bold text-blue-600">{selectedLoan.paymentsRemaining}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Estimated Completion</p>
                      <p className="font-bold text-green-600">
                        {formatDate(selectedLoan.estimatedCompletionDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-medium mb-3">Recent Payment History</h4>
                <div className="space-y-2">
                  {paymentHistory.slice(0, 5).map((payment, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">
                          {formatDate(payment.periodStart)} - {formatDate(payment.periodEnd)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Released: {formatDate(payment.releasedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(selectedLoan.biweeklyPayment)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

















