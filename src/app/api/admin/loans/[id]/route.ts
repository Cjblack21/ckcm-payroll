import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const loanId = resolvedParams.id

    const loan = await prisma.loan.findUnique({
      where: { loans_id: loanId },
      include: {
        user: { 
          select: { 
            users_id: true, 
            name: true, 
            email: true,
            role: true
          } 
        }
      }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const loanDetails = {
      loans_id: loan.loans_id,
      users_id: loan.users_id,
      userName: loan.user?.name ?? null,
      userEmail: loan.user?.email || '',
      userRole: loan.user?.role || '',
      amount: Number(loan.amount),
      balance: Number(loan.balance),
      monthlyPaymentPercent: Number(loan.monthlyPaymentPercent),
      termMonths: loan.termMonths,
      status: loan.status,
      startDate: loan.startDate.toISOString(),
      endDate: loan.endDate.toISOString(),
      purpose: loan.purpose || '',
      createdAt: loan.createdAt.toISOString(),
      updatedAt: loan.updatedAt.toISOString(),
    }

    return NextResponse.json(loanDetails)
  } catch (error) {
    console.error('Error fetching loan details:', error)
    return NextResponse.json({ error: 'Failed to fetch loan details' }, { status: 500 })
  }
}
