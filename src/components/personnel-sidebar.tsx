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
    avatar: "",
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/personnel/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img 
                    src="/ckcm.png" 
                    alt="CKCM Logo" 
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">CKCM PMS</span>
                  <span className="text-xs">Employee</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                  <Link href="/personnel/leaves">
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
