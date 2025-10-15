import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const users = await prisma.user.findMany({
    where: { isActive: true, role: "PERSONNEL" },
    select: { users_id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
  // Map to the shape expected by the UI (employees_id, firstName, lastName)
  const mapped = users.map(u => {
    const [firstName, ...rest] = (u.name || "").split(" ")
    const lastName = rest.join(" ")
    return {
      employees_id: u.users_id,
      firstName: firstName || u.email.split("@")[0],
      lastName: lastName || "",
      email: u.email,
    }
  })
  return NextResponse.json(mapped)
}


