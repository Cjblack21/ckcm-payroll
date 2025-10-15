import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check all payroll entries
    const allPayrollEntries = await prisma.payrollEntry.findMany({
      select: {
        payroll_entries_id: true,
        status: true,
        releasedAt: true,
        processedAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { processedAt: 'desc' }
    })

    // Check archived entries specifically
    const archivedEntries = await prisma.payrollEntry.findMany({
      where: {
        status: 'ARCHIVED'
      },
      select: {
        payroll_entries_id: true,
        status: true,
        releasedAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      totalPayrollEntries: allPayrollEntries.length,
      archivedPayrollEntries: archivedEntries.length,
      allEntries: allPayrollEntries,
      archivedEntries: archivedEntries
    })

  } catch (error) {
    console.error('Error in test endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
