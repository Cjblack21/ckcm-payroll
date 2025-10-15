import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all loans for the user
    const loans = await prisma.loan.findMany({
      where: {
        users_id: userId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get user's payroll entries to calculate payment history
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: {
        users_id: userId,
        status: 'RELEASED'
      },
      orderBy: {
        periodEnd: 'desc'
      }
    })

    // Calculate loan progress for each loan
    const loansWithProgress = loans.map(loan => {
      const loanAmount = Number(loan.amount)
      const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
      const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
      const biweeklyPayment = monthlyPayment / 2

      // Calculate total payments made (approximate based on payroll entries)
      const totalPaymentsMade = payrollEntries.length * biweeklyPayment
      const remainingBalance = Math.max(0, loanAmount - totalPaymentsMade)
      const progressPercentage = Math.min(100, (totalPaymentsMade / loanAmount) * 100)

      // Calculate estimated completion date
      const paymentsRemaining = Math.ceil(remainingBalance / biweeklyPayment)
      const estimatedCompletionDate = new Date()
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + (paymentsRemaining * 14)) // 14 days per biweekly period

      return {
        ...loan,
        loanAmount,
        monthlyPayment,
        biweeklyPayment,
        totalPaymentsMade,
        remainingBalance,
        progressPercentage,
        estimatedCompletionDate,
        paymentsRemaining
      }
    })

    // Calculate summary statistics
    const activeLoans = loansWithProgress.filter(loan => loan.status === 'ACTIVE')
    const totalActiveLoanAmount = activeLoans.reduce((sum, loan) => sum + loan.loanAmount, 0)
    const totalMonthlyPayments = activeLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0)
    const totalBiweeklyPayments = activeLoans.reduce((sum, loan) => sum + loan.biweeklyPayment, 0)
    const totalRemainingBalance = activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0)

    return NextResponse.json({
      loans: loansWithProgress,
      summary: {
        totalLoans: loans.length,
        activeLoans: activeLoans.length,
        completedLoans: loans.filter(loan => loan.status === 'COMPLETED').length,
        totalActiveLoanAmount,
        totalMonthlyPayments,
        totalBiweeklyPayments,
        totalRemainingBalance
      },
      paymentHistory: payrollEntries.map(entry => ({
        periodStart: entry.periodStart,
        periodEnd: entry.periodEnd,
        releasedAt: entry.releasedAt,
        netPay: Number(entry.netPay)
      }))
    })

  } catch (error) {
    console.error('Error fetching personnel loans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loans data' },
      { status: 500 }
    )
  }
}







