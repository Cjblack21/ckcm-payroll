'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDateForDisplay } from '@/lib/timezone'

interface ArchivedPayrollDetailsDialogProps {
  entry: any
  period: any
  isOpen: boolean
  onClose: () => void
}

export default function ArchivedPayrollDetailsDialog({
  entry,
  period,
  isOpen,
  onClose
}: ArchivedPayrollDetailsDialogProps) {
  const [liveData, setLiveData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchLiveBreakdown() {
      if (!entry || !isOpen) return
      
      setLoading(true)
      try {
        let overloadPayDetails: any[] = []
        let deductionDetails: any[] = []
        let loanDetails: any[] = []
        
        // Parse snapshot if string
        let snapshot = entry.breakdownSnapshot
        if (snapshot && typeof snapshot === 'string') {
          try {
            snapshot = JSON.parse(snapshot)
          } catch (e) {
            console.error('Parse error:', e)
            snapshot = null
          }
        }
        
        // Get from snapshot first
        overloadPayDetails = snapshot?.overloadPayDetails || []
        deductionDetails = snapshot?.deductionDetails || []
        loanDetails = snapshot?.loanDetails || []
        
        // If snapshot doesn't have detailed breakdown, fetch live data
        if (overloadPayDetails.length === 0 || deductionDetails.length === 0) {
          // Fetch overload pays
          const overloadRes = await fetch('/api/admin/overload-pay')
          if (overloadRes.ok) {
            const allOverload = await overloadRes.json()
            const userOverload = allOverload.filter((op: any) => op.users_id === entry.users_id)
            if (userOverload.length > 0) {
              overloadPayDetails = userOverload.map((op: any) => ({
                type: op.type || 'OVERTIME',
                amount: Number(op.amount)
              }))
            }
          }
          
          // Fetch deductions
          const deductionsRes = await fetch('/api/admin/deductions')
          if (deductionsRes.ok) {
            const allDeductions = await deductionsRes.json()
            const userDeductions = allDeductions.filter((d: any) => d.users_id === entry.users_id && !d.archivedAt)
            if (userDeductions.length > 0) {
              deductionDetails = userDeductions.map((d: any) => ({
                type: d.deductionType.name,
                amount: Number(d.amount),
                description: d.deductionType.description || '',
                isMandatory: d.deductionType.isMandatory,
                calculationType: d.deductionType.calculationType,
                percentageValue: d.deductionType.percentageValue
              }))
            }
          }
          
          // Fetch loans
          const loansRes = await fetch('/api/admin/loans')
          if (loansRes.ok) {
            const allLoans = await loansRes.json()
            const userLoans = (allLoans.items || []).filter((l: any) => l.users_id === entry.users_id && l.status === 'ACTIVE')
            if (userLoans.length > 0) {
              loanDetails = userLoans.map((l: any) => {
                const monthlyPayment = Number(l.amount) * (Number(l.monthlyPaymentPercent) / 100)
                const paymentAmount = monthlyPayment / 2
                return {
                  type: l.purpose || 'Loan',
                  amount: paymentAmount,
                  remainingBalance: Number(l.balance),
                  originalAmount: Number(l.amount)
                }
              })
            }
          }
        }
        
        setLiveData({ overloadPayDetails, deductionDetails, loanDetails })
      } catch (error) {
        console.error('Error fetching live breakdown:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLiveBreakdown()
  }, [entry?.users_id, isOpen])

  if (!entry || !period) return null

  const formatCurrency = (amount: number) => {
    const safeAmount = Number.isFinite(amount) ? amount : 0
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  const monthlyBasic = Number(entry.user?.personnelType?.basicSalary || 20000)
  const periodSalary = monthlyBasic / 2
  const dbNetPay = Number(entry.netPay || 0)
  const deductions = Number(entry.deductions || 0)

  // Use live data if available
  const overloadPayDetails = liveData?.overloadPayDetails || []
  const deductionDetails = liveData?.deductionDetails || []
  const loanDetails = liveData?.loanDetails || []

  // Calculate overload pay
  let overloadPay = overloadPayDetails.reduce((sum: number, detail: any) => sum + Number(detail.amount), 0)
  if (overloadPay === 0 && dbNetPay > periodSalary) {
    overloadPay = dbNetPay - periodSalary + deductions
  }

  const mandatoryDeductions = deductionDetails.filter((d: any) => d.isMandatory)
  const attendanceDeductions = deductionDetails.filter((d: any) => {
    const type = d.type?.toLowerCase() || ''
    return !d.isMandatory && (type.includes('late') || type.includes('early') || type.includes('absent') || type.includes('tardiness') || type.includes('partial'))
  })
  const otherDeductions = deductionDetails.filter((d: any) => {
    const type = d.type?.toLowerCase() || ''
    return !d.isMandatory && !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
  })

  const actualLoans = loanDetails.filter((l: any) => !l.type?.startsWith('[DEDUCTION]'))
  const deductionPayments = loanDetails.filter((l: any) => l.type?.startsWith('[DEDUCTION]'))

  const grossPay = periodSalary + overloadPay
  const netPay = grossPay - deductions

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Archived Payroll Details</DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}
        
        {!loading && (
          <div className="space-y-4 pb-8">
            {/* Header with Logo */}
            <div className="text-center border-b-2 border-gray-300 dark:border-gray-700 pb-4">
              <div className="flex justify-center mb-3">
                <img src="/ckcm.png" alt="CKCM Logo" className="h-16 w-16" />
              </div>
              <h3 className="font-bold text-base">Christ the King College De Maranding</h3>
              <p className="text-xs text-muted-foreground">Maranding Lala Lanao del Norte</p>
              <p className="text-xs text-muted-foreground">CKCM PMS (Payroll Management System)</p>
              <h2 className="font-bold text-xl mt-3">PAYROLL DETAILS</h2>
            </div>

            {/* Personnel Information */}
            <div className="space-y-1 text-sm border-b pb-3">
              <div className="flex justify-between">
                <span className="font-semibold">Personnel:</span>
                <span>{entry.user?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Email:</span>
                <span className="text-xs">{entry.user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Department:</span>
                <span>{entry.user?.personnelType?.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Position:</span>
                <span>{entry.user?.personnelType?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Personnel Type:</span>
                <span>{entry.user?.personnelType?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Period:</span>
                <span>{formatDateForDisplay(new Date(period.periodStart))} - {formatDateForDisplay(new Date(period.periodEnd))}</span>
              </div>
            </div>

            {/* Salary Details */}
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Monthly Basic Salary</span>
                <span>{formatCurrency(monthlyBasic)}</span>
              </div>
              <div className="flex justify-between py-2 border-b bg-green-50 dark:bg-green-950/20 px-2">
                <span className="font-semibold">Period Salary (Semi-Monthly)</span>
                <span className="text-green-600 font-bold">{formatCurrency(periodSalary)}</span>
              </div>
              
              {/* Additional Pay Section */}
              {(overloadPayDetails.length > 0 || overloadPay > 0) && (
                <p className="text-sm font-semibold text-muted-foreground mt-2">Additional Pay:</p>
              )}
              
              {/* Additional Pay Details */}
              {overloadPayDetails.length > 0 ? (
                overloadPayDetails.map((detail: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/20 px-2">
                    <span className="font-semibold">
                      + {detail.type === 'POSITION_PAY' ? 'Position Pay' : 
                         detail.type === 'BONUS' ? 'Bonus' : 
                         detail.type === '13TH_MONTH' ? '13th Month Pay' : 
                         detail.type === 'OVERTIME' ? 'Overtime' : 
                         detail.type === 'OVERLOAD' ? 'OVERLOAD' :
                         detail.type}
                    </span>
                    <span className="text-emerald-600 font-bold">+{formatCurrency(Number(detail.amount))}</span>
                  </div>
                ))
              ) : (
                overloadPay > 0 && (
                  <div className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/20 px-2">
                    <span className="font-semibold">+ Additional Pay</span>
                    <span className="text-emerald-600 font-bold">+{formatCurrency(overloadPay)}</span>
                  </div>
                )
              )}
              
              {/* GROSS PAY */}
              <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-950/20 px-2 rounded font-bold text-lg">
                <span>GROSS PAY</span>
                <span className="text-blue-600">{formatCurrency(grossPay)}</span>
              </div>
              
              {/* Loan Payments */}
              {actualLoans.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Loan Payments:</p>
                  {actualLoans.map((loan: any, idx: number) => (
                    <div key={idx} className="border-b pl-4 py-1.5">
                      <div className="flex justify-between">
                        <span className="text-sm">{loan.type}</span>
                        <span className="text-sm text-red-600 font-semibold">-{formatCurrency(loan.amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        {loan.originalAmount && (
                          <div>Total Amount: {formatCurrency(loan.originalAmount)}</div>
                        )}
                        {loan.remainingBalance > 0 && (
                          <div>Remaining Balance: {formatCurrency(loan.remainingBalance)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {/* Deduction Payments */}
              {deductionPayments.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Deduction Payments:</p>
                  {deductionPayments.map((deduction: any, idx: number) => (
                    <div key={idx} className="border-b pl-4 py-1.5">
                      <div className="flex justify-between">
                        <span className="text-sm">{deduction.type?.replace('[DEDUCTION] ', '') || deduction.type}</span>
                        <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        {deduction.originalAmount && (
                          <div>Total Amount: {formatCurrency(deduction.originalAmount)}</div>
                        )}
                        {deduction.remainingBalance > 0 && (
                          <div>Remaining Balance: {formatCurrency(deduction.remainingBalance)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {/* Mandatory Deduction Details */}
              {mandatoryDeductions.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Mandatory Deductions:</p>
                  {mandatoryDeductions.map((deduction: any, idx: number) => (
                    <div key={idx} className="border-b pl-4 py-1.5">
                      <div className="flex justify-between">
                        <span className="text-sm">{deduction.type}</span>
                        <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {deduction.calculationType === 'PERCENTAGE' && deduction.percentageValue 
                          ? `${deduction.percentageValue}% of salary` 
                          : 'Fixed amount'}
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {/* Attendance Deductions */}
              {attendanceDeductions.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Attendance Deductions:</p>
                  {attendanceDeductions.map((deduction: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b pl-4">
                      <span className="text-sm">{deduction.type}</span>
                      <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                    </div>
                  ))}
                </>
              )}
              
              {otherDeductions.length > 0 && (
                <>
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Other Deductions:</p>
                  {otherDeductions.map((deduction: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b pl-4">
                      <span className="text-sm">{deduction.type}</span>
                      <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                    </div>
                  ))}
                </>
              )}
              
              {(mandatoryDeductions.length === 0 && otherDeductions.length === 0) && deductions > 0 && (
                <div className="flex justify-between py-2 border-b bg-red-50 dark:bg-red-950/20 px-2">
                  <span className="font-semibold">- Total Deductions</span>
                  <span className="text-red-600 font-bold">-{formatCurrency(deductions)}</span>
                </div>
              )}
              
              {/* NET PAY */}
              <div className="flex justify-between py-3 bg-primary/10 px-2 rounded">
                <span className="text-lg font-bold">NET PAY</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(netPay)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
