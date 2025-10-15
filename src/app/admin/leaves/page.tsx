"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

export default function LeavesPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Leave Management
        </h2>
        <p className="text-muted-foreground">
          Manage employee leave requests and approvals
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Leave management functionality is currently under development.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
