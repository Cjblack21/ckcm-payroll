"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Database, 
  Archive, 
  Shield, 
  Clock,
  Users,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { toast } from "react-hot-toast"

type DataRetentionStats = {
  totalUsers: number
  totalPayrollEntries: number
  totalAttendanceRecords: number
  totalDeductions: number
  totalLoans: number
  totalHolidays: number
  oldestRecord: string
  newestRecord: string
  dataSize: string
  retentionPolicy: string
}

type DataIntegrityCheck = {
  check: string
  status: 'PASS' | 'WARN' | 'FAIL'
  message: string
  count?: number
}

export default function DataRetentionPage() {
  const [stats, setStats] = useState<DataRetentionStats | null>(null)
  const [integrityChecks, setIntegrityChecks] = useState<DataIntegrityCheck[]>([])
  const [loading, setLoading] = useState(true)

  async function loadDataRetentionStats() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/data-retention/stats')
      const data = await res.json()
      
      if (res.ok) {
        setStats(data.stats)
        setIntegrityChecks(data.integrityChecks)
      } else {
        toast.error(data.error || 'Failed to load data retention stats')
      }
    } catch (error) {
      toast.error('Failed to load data retention stats')
    } finally {
      setLoading(false)
    }
  }

  async function runIntegrityCheck() {
    try {
      const res = await fetch('/api/admin/data-retention/integrity-check', {
        method: 'POST'
      })
      const data = await res.json()
      
      if (res.ok) {
        setIntegrityChecks(data.checks)
        toast.success('Data integrity check completed')
      } else {
        toast.error(data.error || 'Failed to run integrity check')
      }
    } catch (error) {
      toast.error('Failed to run integrity check')
    }
  }

  async function createBackup() {
    try {
      const res = await fetch('/api/admin/data-retention/backup', {
        method: 'POST'
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success('Data backup created successfully')
      } else {
        toast.error(data.error || 'Failed to create backup')
      }
    } catch (error) {
      toast.error('Failed to create backup')
    }
  }

  useEffect(() => {
    loadDataRetentionStats()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'FAIL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return <Badge variant="default" className="bg-green-500">PASS</Badge>
      case 'WARN':
        return <Badge variant="secondary" className="bg-yellow-500">WARN</Badge>
      case 'FAIL':
        return <Badge variant="destructive">FAIL</Badge>
      default:
        return <Badge variant="outline">UNKNOWN</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between rounded-md px-4 py-3 bg-transparent dark:bg-sidebar text-foreground dark:text-sidebar-foreground">
        <h2 className="text-3xl font-bold tracking-tight">Data Retention Management</h2>
        <div className="flex items-center gap-2">
          <Button onClick={runIntegrityCheck} variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Run Integrity Check
          </Button>
          <Button onClick={createBackup} variant="outline">
            <Archive className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Data Retention Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Retention Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Retention Period</h4>
              <p className="text-sm text-muted-foreground">
                <strong>FOREVER</strong> - All data is retained indefinitely as per business requirements.
                No automatic deletion or archival policies are applied.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Protection</h4>
              <p className="text-sm text-muted-foreground">
                All payroll, attendance, deduction, and loan data is permanently stored
                with full audit trails and integrity checks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading data retention statistics...</div>
      ) : stats && (
        <>
          {/* Data Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All users (active + inactive)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payroll Entries</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPayrollEntries.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All payroll records
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAttendanceRecords.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All attendance data
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Size</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.dataSize}</div>
                <p className="text-xs text-muted-foreground">
                  Estimated storage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Deductions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDeductions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All deduction records
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Loans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLoans.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All loan records
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Holidays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalHolidays.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All holiday records
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Range */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Data Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Oldest Record</h4>
                  <p className="text-sm text-muted-foreground">{stats.oldestRecord}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Newest Record</h4>
                  <p className="text-sm text-muted-foreground">{stats.newestRecord}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Data Integrity Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Integrity Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {integrityChecks.length > 0 ? (
            <div className="space-y-4">
              {integrityChecks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <div className="font-medium">{check.check}</div>
                      <div className="text-sm text-muted-foreground">{check.message}</div>
                      {check.count !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Count: {check.count.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(check.status)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No integrity checks have been run yet. Click "Run Integrity Check" to verify data integrity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}










