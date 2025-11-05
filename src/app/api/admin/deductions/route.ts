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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const showArchived = searchParams.get('archived') === 'true'
  
  // Exclude attendance-related deductions - these are automatically calculated and managed by the attendance system
  const attendanceRelatedTypes = ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Partial Attendance']
  
  const deductions = await prisma.deduction.findMany({
    where: {
      deductionType: {
        name: {
          notIn: attendanceRelatedTypes
        }
      },
      archivedAt: showArchived ? { not: null } : null
    },
    include: {
      user: { 
        select: { 
          users_id: true, 
          name: true, 
          email: true,
          personnelType: {
            select: {
              department: true,
              basicSalary: true
            }
          }
        } 
      },
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
        if (targetEmployeeIds.length === 0) {
          throw new Error("No active personnel found")
        }
      } else if (entry.employees && entry.employees.length > 0) {
        targetEmployeeIds = entry.employees
      } else {
        throw new Error("No employees selected. Please select employees or enable 'Select All'")
      }

      // Get the deduction type with calculation details
      const deductionType = await prisma.deductionType.findUnique({
        where: { deduction_types_id: entry.deduction_types_id },
        select: { 
          amount: true, 
          isMandatory: true,
          calculationType: true,
          percentageValue: true
        }
      })

      if (!deductionType) {
        throw new Error("Deduction type not found")
      }

      // Note: Removed automatic duplicate prevention for mandatory deductions
      // Admins can now manually create deductions even if they already exist
      // This allows for multiple instances of the same deduction type per employee if needed

      // Get user salaries for percentage calculation
      const users = await prisma.user.findMany({
        where: { users_id: { in: targetEmployeeIds } },
        select: { 
          users_id: true,
          personnelType: {
            select: { basicSalary: true }
          }
        }
      })

      return targetEmployeeIds.map((eid) => {
        const user = users.find(u => u.users_id === eid)
        
        // Calculate deduction amount based on type
        let deductionAmount = deductionType.amount
        
        if (deductionType.calculationType === 'PERCENTAGE' && deductionType.percentageValue && user?.personnelType) {
          // Calculate percentage of basic salary
          const salary = user.personnelType.basicSalary
          deductionAmount = salary.mul(deductionType.percentageValue).div(100)
        }

        return prisma.deduction.create({
          data: {
            users_id: eid,
            deduction_types_id: entry.deduction_types_id,
            amount: deductionAmount,
            notes: entry.notes,
          },
        })
      })
    }

    const tx = 'entries' in data
      ? (await Promise.all(data.entries.map(makeCreates))).flat()
      : await makeCreates(data)

    const created = await prisma.$transaction(tx)
    return NextResponse.json({ count: created.length }, { status: 201 })
  } catch (error) {
    console.error('Error creating deductions:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Failed to create deductions" }, { status: 500 })
  }
}

