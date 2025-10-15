import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const entrySchema = z.object({
  deduction_types_id: z.string().min(1),
  notes: z.string().optional(),
  selectAll: z.boolean().optional().default(false),
  employees: z.array(z.string()).optional(), // employees_id[] when not selectAll
})

const createSchema = z.union([
  entrySchema,
  z.object({ entries: z.array(entrySchema).min(1) })
])

type Entry = z.infer<typeof entrySchema>
type CreatePayload = Entry | { entries: Entry[] }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Exclude attendance-related deductions - these are automatically calculated and managed by the attendance system
  const attendanceRelatedTypes = ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Partial Attendance']
  
  const deductions = await prisma.deduction.findMany({
    where: {
      deductionType: {
        name: {
          notIn: attendanceRelatedTypes
        }
      }
    },
    include: {
      user: { select: { users_id: true, name: true, email: true } },
      deductionType: true,
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(deductions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const data: CreatePayload = createSchema.parse(body)

    const makeCreates = async (entry: Entry) => {
      let targetEmployeeIds: string[] = []
      if (entry.selectAll) {
        const activeUsers = await prisma.user.findMany({ where: { isActive: true, role: 'PERSONNEL' }, select: { users_id: true } })
        targetEmployeeIds = activeUsers.map((u) => u.users_id)
      } else if (entry.employees && entry.employees.length > 0) {
        targetEmployeeIds = entry.employees
      } else {
        throw new Error("No employees selected")
      }

      // Get the amount from the deduction type
      const deductionType = await prisma.deductionType.findUnique({
        where: { deduction_types_id: entry.deduction_types_id },
        select: { amount: true }
      })

      if (!deductionType) {
        throw new Error("Deduction type not found")
      }

      return targetEmployeeIds.map((eid) =>
        prisma.deduction.create({
          data: {
            users_id: eid,
            deduction_types_id: entry.deduction_types_id,
            amount: deductionType.amount,
            notes: entry.notes,
          },
        })
      )
    }

    const tx = 'entries' in data
      ? (await Promise.all(data.entries.map(makeCreates))).flat()
      : await makeCreates(data)

    const created = await prisma.$transaction(tx)
    return NextResponse.json({ count: created.length }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create deductions" }, { status: 500 })
  }
}

