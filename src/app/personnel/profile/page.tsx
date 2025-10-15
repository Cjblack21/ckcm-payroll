"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Building, DollarSign } from "lucide-react"

type ProfileData = {
  user: {
    name: string
    email: string
    position: string
    basicSalary: number
    biweeklySalary: number
  }
}

export default function PersonnelProfile() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfileData() {
      try {
        const res = await fetch('/api/personnel/dashboard')
        if (res.ok) {
          const dashboardData = await res.json()
          setData(dashboardData)
        } else {
          console.error('Failed to load profile data')
        }
      } catch (error) {
        console.error('Error loading profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfileData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Error</h2>
            <p className="text-muted-foreground">Failed to load profile data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">Your personal information and employment details</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Full Name</div>
              <div className="text-lg font-semibold">{data.user.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email Address</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {data.user.email}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Position</div>
              <div className="text-lg font-semibold">{data.user.position}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Monthly Salary</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                ₱{data.user.basicSalary.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Biweekly Salary</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                ₱{data.user.biweeklySalary.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

















