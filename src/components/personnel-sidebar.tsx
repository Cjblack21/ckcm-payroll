"use client"

import * as React from "react"
import { SSRSafe } from "@/components/ssr-safe"
import {
  Home,
  Clock,
  DollarSign,
  CreditCard,
  User,
  Calendar,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import Link from "next/link"

// PMS Personnel Dashboard Data
const getNavData = (user?: { name?: string | null, email?: string }) => ({
  user: {
    name: user?.name || "Personnel User",
    email: user?.email || "personnel@pms.com",
    avatar: "/avatars/personnel.jpg",
  },
  navMain: [],
  projects: [],
})

interface PersonnelSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name?: string | null, email?: string }
}

export function PersonnelSidebar({ user, ...props }: PersonnelSidebarProps) {
  const data = getNavData(user)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <img 
            src="/ckcm.png" 
            alt="CKCM Logo" 
            className="h-8 w-8 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">CKCM PMS</span>
            <span className="text-xs text-muted-foreground">Employee</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {/* Main Dashboard */}
        <SidebarGroup key="personnel-main-v2">
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/personnel/dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* My Information */}
        <SidebarGroup key="personnel-info-v2">
          <SidebarGroupLabel>My Information</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu key="personnel-menu-info-v2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/personnel/attendance">
                    <Clock />
                    <span>Attendance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/leave">
                    <Calendar />
                    <span>Leave</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Financial */}
        <SidebarGroup key="personnel-financial-v2">
          <SidebarGroupLabel>Financial</SidebarGroupLabel>
          <SidebarGroupContent className="w-full min-w-0">
            <SidebarMenu key="personnel-menu-fin-v2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/personnel/payroll">
                    <DollarSign />
                    <span>Payroll</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/personnel/loans">
                    <CreditCard />
                    <span>Loans</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SSRSafe>
          <NavUser user={data.user} />
        </SSRSafe>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
