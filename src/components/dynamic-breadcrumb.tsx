"use client"

import { usePathname } from "next/navigation"
import { Header } from "./header"
import { useMemo } from "react"

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  const breadcrumbs = useMemo(() => {
    // Map routes to their display names
    const routeMap: Record<string, string> = {
      '/admin/dashboard': 'Dashboard',
      '/admin/attendance': 'Attendance',
      '/admin/payroll': 'Payroll',
      '/admin/deductions': 'Mandatory & Add Pay',
      '/admin/users': 'Personnel',
      '/admin/personnel-types': 'Position',
      '/admin/loans': 'Loan & Deduction Management',
      '/admin/profile': 'Profile',
      '/admin/attendance-settings': 'Attendance Settings',
      '/admin/header-settings': 'Header Settings',
      '/admin/holidays': 'Holidays',
      '/admin/reports': 'Reports',
      '/admin/archive': 'Archive',
    }

    const currentPageName = routeMap[pathname] || 'Dashboard'

    return [
      { href: "/admin/dashboard", label: "Admin Dashboard" },
      { label: currentPageName, isCurrentPage: true }
    ]
  }, [pathname])

  return <Header breadcrumbs={breadcrumbs} />
}





