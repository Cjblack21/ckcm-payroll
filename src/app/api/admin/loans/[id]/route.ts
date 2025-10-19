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

export async function PATCH(
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

    const body = await request.json()
    const { amount, monthlyPaymentPercent, termMonths, status, purpose } = body || {}

    const data: any = {}
    if (typeof amount !== 'undefined') {
      const amt = Number(amount)
      if (!(amt > 0)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      data.amount = amt
      // Do NOT auto-reset balance here; admins can manage balance via other flows
    }
    if (typeof monthlyPaymentPercent !== 'undefined') {
      const mpp = Number(monthlyPaymentPercent)
      if (mpp < 0) return NextResponse.json({ error: 'Invalid monthlyPaymentPercent' }, { status: 400 })
      data.monthlyPaymentPercent = mpp
    }
    if (typeof termMonths !== 'undefined') {
      const term = Number(termMonths)
      if (!(term > 0)) return NextResponse.json({ error: 'Invalid termMonths' }, { status: 400 })
      data.termMonths = term
      // Recalculate endDate from startDate + term
      const existing = await prisma.loan.findUnique({ where: { loans_id: loanId }, select: { startDate: true } })
      if (existing?.startDate) {
        const newEnd = new Date(existing.startDate)
        newEnd.setMonth(newEnd.getMonth() + term)
        data.endDate = newEnd
      }
    }
    if (typeof status !== 'undefined') {
      if (!['ACTIVE', 'COMPLETED', 'DEFAULTED'].includes(String(status))) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = status
    }
    if (typeof purpose !== 'undefined') {
      data.purpose = purpose || null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.loan.update({ where: { loans_id: loanId }, data })
    return NextResponse.json({ success: true, loans_id: updated.loans_id })
  } catch (error) {
    console.error('Error updating loan:', error)
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 })
  }
}

export async function DELETE(
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

    await prisma.loan.delete({ where: { loans_id: loanId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting loan:', error)
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 })
  }
}
