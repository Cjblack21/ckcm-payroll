import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').toLowerCase()
    const archived = searchParams.get('archived') === 'true'

    const loans = await prisma.loan.findMany({
      where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
      include: {
        user: { 
          select: { 
            users_id: true, 
            name: true, 
            email: true,
            personnelType: {
              select: {
                department: true
              }
            }
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const items = loans.filter(l => {
      const name = (l.user?.name || '').toLowerCase()
      const email = (l.user?.email || '').toLowerCase()
      return !q || name.includes(q) || email.includes(q)
    }).map(l => ({
      loans_id: l.loans_id,
      users_id: l.users_id,
      userName: l.user?.name ?? null,
      userEmail: l.user?.email || '',
      department: l.user?.personnelType?.department ?? null,
      amount: Number(l.amount),
      balance: Number(l.balance),
      monthlyPaymentPercent: Number(l.monthlyPaymentPercent),
      termMonths: l.termMonths,
      status: l.status,
      purpose: l.purpose,
      createdAt: l.createdAt.toISOString(),
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching loans:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Failed to fetch loans',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { users_id, amount, purpose, monthlyPaymentPercent, termMonths } = body || {}

    if (!users_id || !amount || !termMonths) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amt = Number(amount)
    const monthlyPercent = Number(monthlyPaymentPercent || 0)
    const term = Number(termMonths)
    if (!(amt > 0) || !(term > 0) || monthlyPercent < 0) {
      return NextResponse.json({ error: 'Invalid input values' }, { status: 400 })
    }

    // Calculate start and end dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + term)

    // initial balance is the amount
    const created = await prisma.loan.create({
      data: {
        users_id,
        amount: amt,
        balance: amt,
        monthlyPaymentPercent: monthlyPercent,
        termMonths: term,
        status: 'ACTIVE',
        startDate,
        endDate,
        purpose: purpose || null,
      }
    })

    return NextResponse.json({ loan_id: created.loans_id }, { status: 201 })
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}



