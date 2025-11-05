"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Archive } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

type ArchivedDeduction = {
  deductions_id: string
  amount: number
  notes?: string | null
  appliedAt: string
  archivedAt: string | null
  user: { 
    users_id: string
    name: string | null
    email: string
  }
  deductionType: {
    name: string
    description?: string | null
  }
}

export default function ArchivedDeductionsPage() {
  const [archivedDeductions, setArchivedDeductions] = useState<ArchivedDeduction[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadArchivedDeductions()
  }, [])

  async function loadArchivedDeductions() {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/deductions?archived=true")
      if (res.ok) {
        const data = await res.json()
        setArchivedDeductions(data)
      } else {
        toast.error("Failed to load archived deductions")
      }
    } catch (e) {
      console.error("Failed to load archived deductions:", e)
      toast.error("Failed to load archived deductions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between rounded-md px-4 py-3 bg-transparent dark:bg-sidebar text-foreground dark:text-sidebar-foreground">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Archive className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Archived Deductions
          </h2>
          <p className="text-muted-foreground text-sm">View all deductions that were archived from released payrolls</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/deductions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deductions
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archived Deductions History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-muted-foreground">Loading archived deductions...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Deduction Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Archived Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedDeductions.map((d) => (
                  <TableRow key={d.deductions_id}>
                    <TableCell className="font-medium">{d.user?.name || 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.user?.email || 'N/A'}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{d.deductionType?.name || 'N/A'}</div>
                        {d.deductionType?.description && (
                          <div className="text-xs text-muted-foreground">{d.deductionType.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">₱{Number(d.amount).toFixed(2)}</TableCell>
                    <TableCell>{new Date(d.appliedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}</TableCell>
                    <TableCell>{d.archivedAt ? new Date(d.archivedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'N/A'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {d.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {archivedDeductions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">No archived deductions found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Deductions are archived when payroll is released
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
