import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Archive the loan by setting archivedAt timestamp
    const loan = await prisma.loan.update({
      where: { loans_id: id },
      data: {
        archivedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Loan archived successfully',
      loan,
    })
  } catch (error) {
    console.error('Archive loan error:', error)
    return NextResponse.json(
      { error: 'Failed to archive loan' },
      { status: 500 }
    )
  }
}
